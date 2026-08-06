/**
 * Shared scrape persistence: stage → upsert → sections → provenance → dedupe → series.
 * Use SCRAPE_UPSERT_ONLY=1 with the staging file to skip the network scrape.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competition } from "../lib/schemas";
import { linkFingerprintDuplicates, writeCompetitionSources } from "./dedupe";
import { eventFingerprint } from "./fingerprint";
import { attachSeriesMatches } from "./series-match";
import { enrichPathways } from "./enrich-pathways";
import {
  toSectionRows,
  type ParsedSectionDraft,
} from "./parse-sections";
import {
  finishScrapeRun,
  startScrapeRun,
  type ScrapeRunSource,
} from "./scrape-run";

export type StagedCompetition = Competition & {
  sections?: ParsedSectionDraft[];
};

export function loadDotEnv(): void {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  } catch {
    /* no .env */
  }
}

export function stageCompetitions(filename: string, rows: StagedCompetition[]): string {
  const outDir = join(process.cwd(), "data", "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");
  console.log(`Staged ${rows.length} rows → ${outPath}`);
  return outPath;
}

export function loadStagedCompetitions(filename: string): StagedCompetition[] {
  const path = join(process.cwd(), "data", "staging", filename);
  return JSON.parse(readFileSync(path, "utf8")) as StagedCompetition[];
}

export type PersistResult = {
  upserted: number;
  sectionsWritten: number;
  duplicatesLinked: number;
  seriesAttached: number;
  pathwaysEnriched: number;
};

/**
 * Upsert competitions for one source, then run the shared post-pipeline:
 * sections, fingerprints, competition_sources, cross-source dedupe, series matching.
 */
export async function persistScrapeBatch(
  client: SupabaseClient,
  drafts: StagedCompetition[],
  source: Competition["source"],
  opts: { scrapeRunSource?: ScrapeRunSource; meta?: Record<string, unknown> } = {}
): Promise<PersistResult> {
  const runId = await startScrapeRun(
    client,
    opts.scrapeRunSource ??
      (source === "tla_scrape" ||
      source === "cca_scrape" ||
      source === "onlinereg_scrape" ||
      source === "chess_results_scrape" ||
      source === "fide_calendar_scrape"
        ? source
        : "all"),
    opts.meta ?? {}
  );

  try {
    const withFp = drafts.map((d) => {
      const { sections: _s, ...comp } = d;
      return {
        ...comp,
        fingerprint: eventFingerprint({
          name: d.name,
          start_date: d.start_date,
          state: d.state,
          zip: d.zip,
        }),
      };
    });

    const upserted = await upsertCompetitions(client, withFp, source);

    // Stable ids after upsert (re-read by slug for this source).
    const { data: existing, error: exErr } = await client
      .from("competitions")
      .select("id, slug")
      .eq("source", source);
    if (exErr) throw new Error(`post-upsert lookup failed: ${exErr.message}`);
    const idBySlug = new Map(
      (existing ?? []).map((r) => [r.slug as string, r.id as string])
    );

    const resolved = drafts.map((d) => ({
      ...d,
      id: idBySlug.get(d.slug) ?? d.id,
    }));

    let sectionsWritten = 0;
    try {
      sectionsWritten = await replaceSectionsForCompetitions(client, resolved);
      console.log(`Wrote ${sectionsWritten} section row(s).`);
    } catch (err) {
      console.warn(
        `Sections write failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      await writeCompetitionSources(
        client,
        resolved.map((d) => ({
          competition_id: d.id,
          source: d.source,
          external_key: d.slug,
          source_url: d.source_url,
        }))
      );
    } catch (err) {
      console.warn(
        `competition_sources skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let duplicatesLinked = 0;
    try {
      duplicatesLinked = await linkFingerprintDuplicates(
        client,
        resolved.map(({ sections: _s, ...c }) => ({
          ...c,
          fingerprint: eventFingerprint({
            name: c.name,
            start_date: c.start_date,
            state: c.state,
            zip: c.zip,
          }),
        }))
      );
      if (duplicatesLinked > 0) {
        console.log(`Linked ${duplicatesLinked} cross-source duplicate(s).`);
      }
    } catch (err) {
      console.warn(
        `Dedupe skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let seriesAttached = 0;
    try {
      seriesAttached = await attachSeriesMatches(
        client,
        resolved.map((d) => d.id)
      );
      if (seriesAttached > 0) {
        console.log(`Attached ${seriesAttached} competition(s) to curated series.`);
      }
    } catch (err) {
      console.warn(
        `Series match skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let pathwaysEnriched = 0;
    try {
      const enrich = await enrichPathways(client, {
        competitionIds: resolved.map((d) => d.id),
        source,
      });
      pathwaysEnriched = enrich.updated;
    } catch (err) {
      console.warn(
        `Pathway enrich skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    await finishScrapeRun(client, runId, "succeeded", {
      rows_staged: drafts.length,
      rows_upserted: upserted,
      duplicates_linked: duplicatesLinked,
      series_attached: seriesAttached,
      meta: {
        ...opts.meta,
        pathways_enriched: pathwaysEnriched,
        sections_written: sectionsWritten,
      },
    });

    return {
      upserted,
      sectionsWritten,
      duplicatesLinked,
      seriesAttached,
      pathwaysEnriched,
    };
  } catch (err) {
    await finishScrapeRun(
      client,
      runId,
      "failed",
      { rows_staged: drafts.length, meta: opts.meta },
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/** Delete prior sections for these competitions, then insert parsed (or Open) rows. */
export async function replaceSectionsForCompetitions(
  client: SupabaseClient,
  drafts: StagedCompetition[]
): Promise<number> {
  const ids = drafts.map((d) => d.id);
  if (ids.length === 0) return 0;

  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error } = await client.from("sections").delete().in("competition_id", chunk);
    if (error) throw new Error(`section delete failed: ${error.message}`);
  }

  const rows = drafts.flatMap((d) => toSectionRows(d.id, d.sections ?? []));
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await client.from("sections").insert(chunk as never[]);
    if (error) throw new Error(`section insert failed: ${error.message}`);
    written += chunk.length;
  }
  return written;
}

export async function upsertCompetitions(
  client: SupabaseClient,
  drafts: Competition[],
  source: Competition["source"]
): Promise<number> {
  const { data: existing, error: existingErr } = await client
    .from("competitions")
    .select("id, slug")
    .eq("source", source);
  if (existingErr) throw new Error(`lookup existing failed: ${existingErr.message}`);

  const idBySlug = new Map(
    (existing ?? []).map((r) => [r.slug as string, r.id as string])
  );

  const bySlug = new Map<string, Competition>();
  for (const d of drafts) bySlug.set(d.slug, d);
  if (bySlug.size < drafts.length) {
    console.warn(
      `Deduped ${drafts.length - bySlug.size} in-batch slug collisions before upsert.`
    );
  }

  const payload = [...bySlug.values()].map((d) => {
    // Pathway fields are owned by enrich-pathways — never wipe on scrape upsert.
    // interest_count is owned by save/registration triggers for the same reason.
    // series_id is owned by curation / series-match — omit null so re-scrape
    // does not clear a hand-linked or previously attached series.
    const {
      interest_count: _ic,
      pathway_status: _ps,
      pathway_summary: _psum,
      pathway_related: _pr,
      pathway_input_hash: _ph,
      pathway_model: _pm,
      pathway_enriched_at: _pe,
      series_id,
      ...rest
    } = d;
    const row: Record<string, unknown> = {
      ...rest,
      id: idBySlug.get(d.slug) ?? d.id,
    };
    if (series_id) row.series_id = series_id;
    return row;
  });

  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH);
    let { error } = await client
      .from("competitions")
      .upsert(chunk as never[], { onConflict: "slug" });

    if (error?.message?.includes("source_url")) {
      console.warn(
        "competitions.source_url missing — run supabase/migrations/0002_source_url.sql. " +
          "Upserting without source_url for now."
      );
      const stripped = chunk.map(({ source_url: _drop, ...rest }) => rest);
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (error?.message?.includes("image_url")) {
      console.warn(
        "competitions.image_url missing — run supabase/migrations/0006_competition_image_url.sql. " +
          "Upserting without image_url for now."
      );
      const stripped = chunk.map(({ image_url: _drop, ...rest }) => rest);
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (
      error?.message?.includes("visibility") ||
      error?.message?.includes("org_id") ||
      error?.message?.includes("created_by") ||
      error?.message?.includes("details")
    ) {
      console.warn(
        "competitions visibility/org columns missing — run supabase/migrations/0010_organizations.sql. " +
          "Upserting without tenancy columns for now."
      );
      const stripped = chunk.map(
        ({
          visibility: _v,
          org_id: _o,
          created_by: _c,
          details: _d,
          ...rest
        }) => rest
      );
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (error?.message?.includes("cca_scrape") || error?.message?.includes("check constraint")) {
      throw new Error(
        `${error.message}\n` +
          "Run supabase/migrations/0003_cca_source.sql in the Supabase SQL editor, then retry with:\n" +
          "  SCRAPE_UPSERT_ONLY=1 npm run scrape:cca"
      );
    }

    if (
      error?.message?.includes("fingerprint") ||
      error?.message?.includes("canonical_id")
    ) {
      throw new Error(
        `${error.message}\n` +
          "Run supabase/migrations/0005_ingestion_ops.sql (required for scrape reliability).\n" +
          "Then: npm run scrape:preflight"
      );
    }

    if (error?.message?.includes("pathway_")) {
      throw new Error(
        `${error.message}\n` +
          "Run supabase/migrations/0007_pathway_enrichment.sql, then retry."
      );
    }

    if (error?.message?.includes("entry_fee_cents") && error.message.includes("null")) {
      throw new Error(
        `${error.message}\n` +
          "Run supabase/migrations/0008_nullable_entry_fee.sql so unknown fees can be null."
      );
    }

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted}/${payload.length}`);
  }
  console.log(`\nUpserted ${upserted} competitions (source='${source}').`);
  return upserted;
}
