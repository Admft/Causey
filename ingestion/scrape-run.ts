/**
 * Ops log for each scraper invocation (local, GitHub Actions, Docker).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScrapeRunSource = "tla_scrape" | "cca_scrape" | "all";

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
