/**
 * Shared scrape persistence: stage → upsert → provenance → dedupe → series.
 * Use SCRAPE_UPSERT_ONLY=1 with the staging file to skip the network scrape.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competition } from "../lib/schemas";
import { linkFingerprintDuplicates, writeCompetitionSources } from "./dedupe";
import { eventFingerprint } from "./fingerprint";
import { attachSeriesMatches } from "./series-match";
import {
  finishScrapeRun,
  startScrapeRun,
  type ScrapeRunSource,
} from "./scrape-run";

export function loadDotEnv(): void {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env */
  }
}

export function stageCompetitions(filename: string, rows: Competition[]): string {
  const outDir = join(process.cwd(), "data", "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");
  console.log(`Staged ${rows.length} rows → ${outPath}`);
  return outPath;
}

export function loadStagedCompetitions(filename: string): Competition[] {
  const path = join(process.cwd(), "data", "staging", filename);
  return JSON.parse(readFileSync(path, "utf8")) as Competition[];
}

export type PersistResult = {
  upserted: number;
  duplicatesLinked: number;
  seriesAttached: number;
};

/**
 * Upsert competitions for one source, then run the shared post-pipeline:
 * fingerprints, competition_sources, cross-source dedupe, series matching.
 */
export async function persistScrapeBatch(
  client: SupabaseClient,
  drafts: Competition[],
  source: Competition["source"],
  opts: { scrapeRunSource?: ScrapeRunSource; meta?: Record<string, unknown> } = {}
): Promise<PersistResult> {
  const runId = await startScrapeRun(
    client,
    opts.scrapeRunSource ?? (source === "tla_scrape" || source === "cca_scrape" ? source : "all"),
    opts.meta ?? {}
  );

  try {
    const withFp = drafts.map((d) => ({
      ...d,
      fingerprint: eventFingerprint({
        name: d.name,
        start_date: d.start_date,
        state: d.state,
        zip: d.zip,
      }),
    }));

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

    const resolved = withFp.map((d) => ({
      ...d,
      id: idBySlug.get(d.slug) ?? d.id,
    }));

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
      duplicatesLinked = await linkFingerprintDuplicates(client, resolved);
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

    await finishScrapeRun(client, runId, "succeeded", {
      rows_staged: drafts.length,
      rows_upserted: upserted,
      duplicates_linked: duplicatesLinked,
      series_attached: seriesAttached,
      meta: opts.meta,
    });

    return { upserted, duplicatesLinked, seriesAttached };
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

  const payload = [...bySlug.values()].map((d) => ({
    ...d,
    id: idBySlug.get(d.slug) ?? d.id,
  }));

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
      console.warn(
        "fingerprint/canonical_id columns missing — run 0005_ingestion_ops.sql. " +
          "Upserting without those fields for now (dedupe will be skipped)."
      );
      const stripped = chunk.map(
        ({ fingerprint: _f, canonical_id: _c, ...rest }) => rest
      );
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted}/${payload.length}`);
  }
  console.log(`\nUpserted ${upserted} competitions (source='${source}').`);
  return upserted;
}
