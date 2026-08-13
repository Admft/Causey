import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScrapeRunSource } from "./scrape-run";

export type RetractionMode = "off" | "dry-run" | "apply";

export type StaleRetractionResult = {
  mode: RetractionMode;
  candidates: number;
  archived: number;
  cutoff: string | null;
};

export function configuredRetractionMode(
  value = process.env.SCRAPE_RETRACT_STALE
): RetractionMode {
  if (!value) return "off";
  const normalized = value.trim().toLowerCase();
  if (normalized === "dry-run" || normalized === "dry") return "dry-run";
  if (normalized === "apply") return "apply";
  throw new Error(
    "SCRAPE_RETRACT_STALE must be 'dry-run' or 'apply'; ambiguous boolean values are refused."
  );
}

function cutoffIso(now: Date, graceDays: number): string {
  return new Date(now.getTime() - graceDays * 86_400_000).toISOString();
}

/**
 * Archive listings no source has seen within the grace period.
 *
 * Callers must provide a complete, successfully persisted source snapshot.
 * A stale legacy external key cannot archive an event when a newer stable-key
 * sighting exists for that competition.
 */
export async function retractStaleSourceListings(
  client: SupabaseClient,
  source: Exclude<ScrapeRunSource, "all">,
  opts: {
    completeSourceSnapshot: boolean;
    mode?: RetractionMode;
    graceDays?: number;
    now?: Date;
  }
): Promise<StaleRetractionResult> {
  const mode = opts.mode ?? configuredRetractionMode();
  if (mode === "off" || !opts.completeSourceSnapshot) {
    return { mode, candidates: 0, archived: 0, cutoff: null };
  }

  const graceDays = opts.graceDays ?? Number(process.env.SCRAPE_STALE_GRACE_DAYS ?? 7);
  if (!Number.isFinite(graceDays) || graceDays < 1) {
    throw new Error("SCRAPE_STALE_GRACE_DAYS must be at least 1.");
  }
  const cutoff = cutoffIso(opts.now ?? new Date(), graceDays);
  const { data: staleRows, error: staleError } = await client
    .from("competition_sources")
    .select("competition_id")
    .eq("source", source)
    .lt("last_seen_at", cutoff);
  if (staleError) {
    throw new Error(`stale source lookup failed: ${staleError.message}`);
  }

  const candidateIds = [
    ...new Set((staleRows ?? []).map((row) => row.competition_id as string)),
  ];
  if (candidateIds.length === 0) {
    return { mode, candidates: 0, archived: 0, cutoff };
  }

  const allSightings: Array<{ competition_id: string; last_seen_at: string }> = [];
  for (let i = 0; i < candidateIds.length; i += 200) {
    const ids = candidateIds.slice(i, i + 200);
    const { data, error } = await client
      .from("competition_sources")
      .select("competition_id, last_seen_at")
      .in("competition_id", ids);
    if (error) throw new Error(`source freshness lookup failed: ${error.message}`);
    allSightings.push(
      ...((data ?? []) as Array<{ competition_id: string; last_seen_at: string }>)
    );
  }

  const hasFreshSighting = new Set(
    allSightings
      .filter((row) => row.last_seen_at >= cutoff)
      .map((row) => row.competition_id)
  );
  const retractable = candidateIds.filter((id) => !hasFreshSighting.has(id));
  console.log(
    `Stale retraction ${mode}: ${retractable.length}/${candidateIds.length} candidate(s), ` +
      `grace=${graceDays}d cutoff=${cutoff}.`
  );
  if (mode === "dry-run" || retractable.length === 0) {
    return { mode, candidates: retractable.length, archived: 0, cutoff };
  }

  let archived = 0;
  for (let i = 0; i < retractable.length; i += 200) {
    const ids = retractable.slice(i, i + 200);
    const { error, count } = await client
      .from("competitions")
      .update({ status: "archived" }, { count: "exact" })
      .in("id", ids)
      .neq("status", "archived")
      .is("canonical_id", null);
    if (error) throw new Error(`stale competition archive failed: ${error.message}`);
    archived += count ?? 0;
  }
  return { mode, candidates: retractable.length, archived, cutoff };
}
