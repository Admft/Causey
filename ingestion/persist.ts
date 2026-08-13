/**
 * Shared scrape persistence: stage → upsert → sections → provenance → dedupe → series.
 * Use SCRAPE_UPSERT_ONLY=1 with the staging file to skip the network scrape.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competition } from "../lib/schemas";
import {
  assertSourceAutomationAllowed,
  assertSourceBatchHealthy,
} from "../lib/ingestion-sources";
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
import {
  retractStaleSourceListings,
  type RetractionMode,
} from "./stale-retraction";

export type StagedCompetition = Competition & {
  /** Stable source-native identity; legacy staged files fall back safely. */
  external_key?: string;
  sections?: ParsedSectionDraft[];
};

export function chessCompetitionIds(
  rows: ReadonlyArray<Pick<StagedCompetition, "id" | "category">>
): string[] {
  return rows.filter((row) => row.category === "chess").map((row) => row.id);
}

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

export type StagingMetadata = {
  rowCount: number;
  completeSourceSnapshot: boolean;
  stagedAt: string;
};

export function stageCompetitions(
  filename: string,
  rows: StagedCompetition[],
  opts: { completeSourceSnapshot?: boolean } = {}
): string {
  const outDir = join(process.cwd(), "data", "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");
  writeFileSync(
    `${outPath}.meta.json`,
    JSON.stringify(
      {
        rowCount: rows.length,
        completeSourceSnapshot: opts.completeSourceSnapshot === true,
        stagedAt: new Date().toISOString(),
      } satisfies StagingMetadata,
      null,
      2
    ) + "\n"
  );
  console.log(`Staged ${rows.length} rows → ${outPath}`);
  return outPath;
}

export function loadStagedCompetitions(filename: string): StagedCompetition[] {
  const path = join(process.cwd(), "data", "staging", filename);
  return JSON.parse(readFileSync(path, "utf8")) as StagedCompetition[];
}

export function loadStagingMetadata(filename: string): StagingMetadata | null {
  try {
    const path = join(process.cwd(), "data", "staging", `${filename}.meta.json`);
    return JSON.parse(readFileSync(path, "utf8")) as StagingMetadata;
  } catch {
    // Legacy staging files have no manifest and are never treated as complete.
    return null;
  }
}

export type PersistResult = {
  upserted: number;
  sectionsWritten: number;
  duplicatesLinked: number;
  seriesAttached: number;
  pathwaysEnriched: number;
  staleArchived: number;
};

/** A temporary fetch failure must not erase a cover captured on an earlier run. */
export function preserveExistingImage(
  incoming: string | null | undefined,
  existing: string | null | undefined
): string | null {
  return incoming || existing || null;
}

async function loadExistingCompetitionsBySlug(
  client: SupabaseClient,
  slugs: string[]
): Promise<Array<{ id: string; slug: string; image_url: string | null }>> {
  const uniqueSlugs = [...new Set(slugs)];
  const rows: Array<{ id: string; slug: string; image_url: string | null }> = [];
  const BATCH = 200;

  for (let i = 0; i < uniqueSlugs.length; i += BATCH) {
    const chunk = uniqueSlugs.slice(i, i + BATCH);
    const { data, error } = await client
      .from("competitions")
      .select("id, slug, image_url")
      .in("slug", chunk);
    if (error) throw new Error(`lookup existing failed: ${error.message}`);
    rows.push(
      ...((data ?? []) as Array<{
        id: string;
        slug: string;
        image_url: string | null;
      }>)
    );
  }

  return rows;
}

async function resolveStableSourceIdentities(
  client: SupabaseClient,
  drafts: StagedCompetition[],
  source: Competition["source"]
): Promise<StagedCompetition[]> {
  const keys = [...new Set(drafts.map(competitionExternalKey))];
  const sourceRows: Array<{ external_key: string; competition_id: string }> = [];
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await client
      .from("competition_sources")
      .select("external_key, competition_id")
      .eq("source", source)
      .in("external_key", keys.slice(i, i + 200));
    if (error) {
      if (
        error.message.includes("competition_sources") ||
        error.message.includes("schema cache") ||
        error.message.includes("does not exist")
      ) {
        throw new Error(
          `${error.message}\nRun the ordered migrations through 0005 before scraping.`
        );
      }
      throw new Error(`source identity lookup failed: ${error.message}`);
    }
    sourceRows.push(
      ...((data ?? []) as Array<{
        external_key: string;
        competition_id: string;
      }>)
    );
  }
  if (sourceRows.length === 0) return drafts;

  const ids = [...new Set(sourceRows.map((row) => row.competition_id))];
  const competitions: Array<{ id: string; slug: string }> = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await client
      .from("competitions")
      .select("id, slug")
      .in("id", ids.slice(i, i + 200));
    if (error) throw new Error(`source identity competition lookup failed: ${error.message}`);
    competitions.push(...((data ?? []) as Array<{ id: string; slug: string }>));
  }
  const competitionById = new Map(competitions.map((row) => [row.id, row]));
  const idByKey = new Map(
    sourceRows.map((row) => [row.external_key, row.competition_id])
  );

  return drafts.map((draft) => {
    const existingId = idByKey.get(competitionExternalKey(draft));
    const existing = existingId ? competitionById.get(existingId) : null;
    return existing
      ? { ...draft, id: existing.id, slug: existing.slug }
      : draft;
  });
}

/**
 * Upsert competitions for one source, then run the shared post-pipeline:
 * sections, fingerprints, competition_sources, cross-source dedupe, series matching.
 */
export async function persistScrapeBatch(
  client: SupabaseClient,
  drafts: StagedCompetition[],
  source: Competition["source"],
  opts: {
    scrapeRunSource?: ScrapeRunSource;
    meta?: Record<string, unknown>;
    completeSourceSnapshot?: boolean;
    retractionMode?: RetractionMode;
  } = {}
): Promise<PersistResult> {
  assertSourceAutomationAllowed(source);
  assertSourceBatchHealthy({ sourceId: source, rows: drafts.length });
  const runId = await startScrapeRun(
    client,
    opts.scrapeRunSource ??
      (source === "tla_scrape" ||
      source === "cca_scrape" ||
      source === "onlinereg_scrape" ||
      source === "chess_results_scrape" ||
      source === "fide_calendar_scrape" ||
      source === "tca_scrape" ||
      source === "tabroom_scrape" ||
      source === "vex_events_scrape" ||
      source === "taea_vase_scrape" ||
      source === "bennington_writers_scrape" ||
      source === "doe_science_bowl_scrape" ||
      source === "afsa_essay_scrape" ||
      source === "uil_theatre_scrape" ||
      source === "uil_speech_debate_scrape" ||
      source === "purple_comet_scrape" ||
      source === "uil_music_marching_scrape" ||
      source === "txsef_scrape"
        ? source
        : "all"),
    opts.meta ?? {}
  );

  try {
    const identityResolved = await resolveStableSourceIdentities(
      client,
      drafts,
      source
    );
    const withFp = identityResolved.map((d) => {
      const { sections: _s, ...comp } = d;
      void _s;
      return {
        ...comp,
        fingerprint: eventFingerprint({
          name: d.name,
          start_date: d.start_date,
          state: d.state,
          zip: d.zip,
          category: d.category,
        }),
      };
    });

    const upserted = await upsertCompetitions(client, withFp, source);

    // Stable ids after upsert. Slugs are globally unique, so resolve across all
    // sources in case this source has taken over an already-indexed URL.
    const existing = await loadExistingCompetitionsBySlug(
      client,
      identityResolved.map((draft) => draft.slug)
    );
    const idBySlug = new Map(
      existing.map((row) => [row.slug, row.id])
    );

    const resolved = identityResolved.map((d) => ({
      ...d,
      id: idBySlug.get(d.slug) ?? d.id,
    }));

    const sectionsWritten = await replaceSectionsForCompetitions(client, resolved);
    console.log(`Wrote ${sectionsWritten} section row(s).`);

    await writeCompetitionSources(
      client,
      resolved.map((d) => ({
        competition_id: d.id,
        source: d.source,
        external_key: competitionExternalKey(d),
        source_url: d.source_url,
      }))
    );

    let duplicatesLinked = 0;
    try {
      duplicatesLinked = await linkFingerprintDuplicates(
        client,
        resolved.map(({ sections: _s, ...c }) => {
          void _s;
          return {
            ...c,
            fingerprint: eventFingerprint({
              name: c.name,
              start_date: c.start_date,
              state: c.state,
              zip: c.zip,
              category: c.category,
            }),
          };
        })
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
    const chessIds = chessCompetitionIds(resolved);
    if (chessIds.length > 0) {
      try {
        seriesAttached = await attachSeriesMatches(client, chessIds);
        if (seriesAttached > 0) {
          console.log(`Attached ${seriesAttached} competition(s) to curated series.`);
        }
      } catch (err) {
        console.warn(
          `Series match skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    let pathwaysEnriched = 0;
    if (chessIds.length > 0) {
      try {
        const enrich = await enrichPathways(client, {
          competitionIds: chessIds,
          source,
        });
        pathwaysEnriched = enrich.updated;
      } catch (err) {
        console.warn(
          `Pathway enrich skipped: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    let staleArchived = 0;
    const runSource = opts.scrapeRunSource;
    if (runSource && runSource !== "all") {
      const retraction = await retractStaleSourceListings(client, runSource, {
        completeSourceSnapshot: opts.completeSourceSnapshot === true,
        mode: opts.retractionMode,
      });
      staleArchived = retraction.archived;
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
        stale_archived: staleArchived,
        complete_source_snapshot: opts.completeSourceSnapshot === true,
      },
    });

    return {
      upserted,
      sectionsWritten,
      duplicatesLinked,
      seriesAttached,
      pathwaysEnriched,
      staleArchived,
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

export function competitionExternalKey(draft: StagedCompetition): string {
  if (draft.external_key?.trim()) return draft.external_key.trim();
  const details = draft.details ?? {};
  const sourceId =
    details.fide_calendar_id ??
    details.chess_results_tnr ??
    details.onlinereg_tid ??
    details.tca_post_id ??
    details.cca_event_id;
  if (typeof sourceId === "string" || typeof sourceId === "number") {
    return String(sourceId);
  }
  // Backward compatibility for old staging files and existing rows.
  return draft.slug;
}

function rpcUnavailable(message: string): boolean {
  return (
    /PGRST202/i.test(message) ||
    /could not find the function/i.test(message) ||
    /schema cache/i.test(message)
  );
}

async function replaceSectionsNonDestructively(
  client: SupabaseClient,
  draft: StagedCompetition
): Promise<number> {
  const { data: oldRows, error: oldError } = await client
    .from("sections")
    .select("id")
    .eq("competition_id", draft.id);
  if (oldError) throw new Error(`section snapshot failed: ${oldError.message}`);

  const newRows = toSectionRows(draft.id, draft.sections ?? []);
  const { error: insertError } = await client
    .from("sections")
    .insert(newRows as never[]);
  if (insertError) {
    throw new Error(`section insert failed (existing rows retained): ${insertError.message}`);
  }

  const newIds = newRows.map((row) => row.id);
  const { data: verifiedRows, error: verifyError } = await client
    .from("sections")
    .select("id")
    .in("id", newIds);
  if (verifyError || (verifiedRows ?? []).length !== newIds.length) {
    await client.from("sections").delete().in("id", newIds);
    throw new Error(
      `section integrity verification failed: ${
        verifyError?.message ?? `expected ${newIds.length}, found ${(verifiedRows ?? []).length}`
      }`
    );
  }

  const oldIds = (oldRows ?? []).map((row) => row.id as string);
  if (oldIds.length > 0) {
    const { error: deleteError } = await client
      .from("sections")
      .delete()
      .in("id", oldIds);
    if (deleteError) {
      throw new Error(
        `section cleanup failed after safe insert: ${deleteError.message}`
      );
    }
  }
  return newRows.length;
}

/**
 * Prefer the service-role transactional ingestion RPC. If it has not been
 * installed yet, insert and verify replacement rows before deleting old rows.
 */
export async function replaceSectionsForCompetitions(
  client: SupabaseClient,
  drafts: StagedCompetition[]
): Promise<number> {
  let written = 0;
  let useRpc = true;
  for (const draft of drafts) {
    const rows = toSectionRows(draft.id, draft.sections ?? []);
    if (useRpc) {
      const payload = rows.map(
        ({
          name,
          min_rating,
          max_rating,
          min_grade,
          max_grade,
          entry_fee_cents,
        }) => ({
          name,
          min_rating,
          max_rating,
          min_grade,
          max_grade,
          entry_fee_cents,
        })
      );
      const { error } = await client.rpc(
        "ingestion_replace_competition_sections",
        {
          p_competition_id: draft.id,
          p_sections: payload,
        }
      );
      if (!error) {
        written += rows.length;
        continue;
      }
      if (!rpcUnavailable(error.message)) {
        throw new Error(`transactional section replace failed: ${error.message}`);
      }
      useRpc = false;
      console.warn(
        "Transactional ingestion section RPC is unavailable; using verified non-destructive replacement."
      );
    }
    written += await replaceSectionsNonDestructively(client, draft);
  }
  return written;
}

export async function upsertCompetitions(
  client: SupabaseClient,
  drafts: StagedCompetition[],
  source: Competition["source"]
): Promise<number> {
  const bySlug = new Map<string, StagedCompetition>();
  for (const d of drafts) bySlug.set(d.slug, d);
  if (bySlug.size < drafts.length) {
    console.warn(
      `Deduped ${drafts.length - bySlug.size} in-batch slug collisions before upsert.`
    );
  }

  // `slug` is globally unique. Looking up only the incoming source can miss a
  // row created by another importer and make the upsert try to replace its id,
  // which PostgreSQL correctly rejects while related rows reference that id.
  const existing = await loadExistingCompetitionsBySlug(client, [...bySlug.keys()]);
  const existingBySlug = new Map(
    existing.map((row) => [
      row.slug,
      {
        id: row.id,
        imageUrl: row.image_url,
      },
    ])
  );

  const payload = [...bySlug.values()].map((d) => {
    // Pathway fields are owned by enrich-pathways — never wipe on scrape upsert.
    // interest_count is owned by save/registration triggers for the same reason.
    // series_id is owned by curation / series-match — omit null so re-scrape
    // does not clear a hand-linked or previously attached series.
    const {
      external_key: _externalKey,
      sections: _sections,
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
    void _externalKey;
    void _sections;
    void _ic;
    void _ps;
    void _psum;
    void _pr;
    void _ph;
    void _pm;
    void _pe;
    const row: Record<string, unknown> = {
      ...rest,
      id: existingBySlug.get(d.slug)?.id ?? d.id,
      image_url: preserveExistingImage(
        d.image_url,
        existingBySlug.get(d.slug)?.imageUrl
      ),
    };
    if (series_id) row.series_id = series_id;
    return row;
  });

  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH);
    const { error } = await client
      .from("competitions")
      .upsert(chunk as never[], { onConflict: "slug" });

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
