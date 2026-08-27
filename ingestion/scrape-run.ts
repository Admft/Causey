/**
 * Ops log for each scraper invocation (local, GitHub Actions, Docker).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScrapeRunSource =
  | "tla_scrape"
  | "cca_scrape"
  | "onlinereg_scrape"
  | "chess_results_scrape"
  | "fide_calendar_scrape"
  | "tca_scrape"
  | "tabroom_scrape"
  | "vex_events_scrape"
  | "taea_vase_scrape"
  | "bennington_writers_scrape"
  | "doe_science_bowl_scrape"
  | "afsa_essay_scrape"
  | "uil_theatre_scrape"
  | "uil_speech_debate_scrape"
  | "purple_comet_scrape"
  | "uil_music_marching_scrape"
  | "txsef_scrape"
  | "all";

export type ScrapeRunStats = {
  rows_staged?: number;
  rows_upserted?: number;
  duplicates_linked?: number;
  series_attached?: number;
  meta?: Record<string, unknown>;
};

export async function startScrapeRun(
  client: SupabaseClient | null,
  source: ScrapeRunSource,
  meta: Record<string, unknown> = {}
): Promise<string | null> {
  if (!client) return null;
  const { data, error } = await client
    .from("scrape_runs")
    .insert({
      source,
      status: "running",
      meta,
    })
    .select("id")
    .single();
  if (error) {
    console.warn(
      `scrape_runs insert skipped (${error.message}). Run migration 0005 if missing.`
    );
    return null;
  }
  return data.id as string;
}

export async function finishScrapeRun(
  client: SupabaseClient | null,
  runId: string | null,
  outcome: "succeeded" | "failed",
  stats: ScrapeRunStats = {},
  errorMessage?: string
): Promise<void> {
  if (!client || !runId) return;
  const { error } = await client
    .from("scrape_runs")
    .update({
      status: outcome,
      finished_at: new Date().toISOString(),
      rows_staged: stats.rows_staged ?? null,
      rows_upserted: stats.rows_upserted ?? null,
      duplicates_linked: stats.duplicates_linked ?? 0,
      series_attached: stats.series_attached ?? 0,
      error: errorMessage ?? null,
      meta: stats.meta ?? {},
    })
    .eq("id", runId);
  if (error) console.warn(`scrape_runs finish failed: ${error.message}`);
}

/**
 * Record a successful source check that intentionally produced no rows.
 * This keeps operational freshness honest without staging an empty snapshot or
 * retracting previously indexed listings.
 */
export async function recordSuccessfulNoopScrapeRun(
  client: SupabaseClient | null,
  source: Exclude<ScrapeRunSource, "all">,
  meta: Record<string, unknown> = {}
): Promise<void> {
  if (!client) {
    if (process.env.REQUIRE_SUPABASE === "1" || process.env.CI === "true") {
      throw new Error(
        `Cannot record the ${source} source check because Supabase is not configured.`
      );
    }
    return;
  }
  const runId = await startScrapeRun(client, source, meta);
  if (!runId) {
    throw new Error(`Could not start the ${source} scrape run log.`);
  }
  await finishScrapeRun(client, runId, "succeeded", {
    rows_staged: 0,
    rows_upserted: 0,
    meta: {
      ...meta,
      no_complete_cycle: true,
      existing_data_unchanged: true,
    },
  });
}
