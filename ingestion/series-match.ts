/**
 * Attach scraped competitions to curated series so /pathways and event
 * unlock sidebars work without hand-linking every row.
 *
 * Only high-confidence name patterns — ambiguous opens stay series_id=null
 * for human curation in Supabase. Qualification rules themselves stay curated
 * on `series` / `qualification_rules` (never auto-invented by scrapers).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkIds } from "./chunk-ids";

export type SeriesMatchRule = {
  /** Case-insensitive substring / regex tested against competition name. */
  match: RegExp;
  /** Optional 2-letter state gate (null = any state). */
  state: string | null;
  /** Must match seed / DB series.id */
  seriesId: string;
  label: string;
};

/**
 * Stable UUIDs from data/seed/series.json. Safe to hardcode — seed:supabase
 * upserts these ids into production.
 */
export const SERIES_MATCH_RULES: SeriesMatchRule[] = [
  {
    match: /\bdenker\s+tournament\s+of\s+high\s+school\s+champions\b/i,
    state: null,
    seriesId: "00000000-0000-4000-8000-000000000101",
    label: "Denker Tournament of High School Champions",
  },
  {
    match: /\bbarber\s+(?:tournament|of\s+k)/i,
    state: null,
    seriesId: "00000000-0000-4000-8000-000000000102",
    label: "Barber Tournament of K-8 Champions",
  },
  {
    match: /\brockefeller\s+tournament\s+of\s+k-?5\s+champions\b/i,
    state: null,
    seriesId: "00000000-0000-4000-8000-000000000103",
    label: "Rockefeller Tournament of K-5 Champions",
  },
  {
    match: /\bharing\s+tournament\s+of\s+girls(?:'|’)?\s+state\s+champions\b/i,
    state: null,
    seriesId: "00000000-0000-4000-8000-000000000104",
    label: "Haring Tournament of Girls State Champions",
  },
  {
    match: /\bu\.?\s*s\.?\s*junior\s+(?:championship|closed)\b/i,
    state: null,
    seriesId: "00000000-0000-4000-8000-000000000105",
    label: "U.S. Junior Championship",
  },
  {
    match: /\btexas\s+(?:state\s+)?scholastic\s+championships?\b/i,
    state: "TX",
    seriesId: "00000000-0000-4000-8000-000000000106",
    label: "Texas Scholastic Championship",
  },
  {
    match: /\bnew\s+york\s+state\s+scholastic\s+championships?\b/i,
    state: "NY",
    seriesId: "00000000-0000-4000-8000-000000000107",
    label: "New York State Scholastic Championship",
  },
  {
    match: /\b(?:calchess|california)\s+(?:state\s+)?scholastic\s+championships?\b/i,
    state: "CA",
    seriesId: "00000000-0000-4000-8000-000000000108",
    label: "CalChess State Scholastic Championship",
  },
  {
    match: /illinois\s+(?:k-?12\s+)?state\s+(?:chess\s+)?championship/i,
    state: "IL",
    seriesId: "00000000-0000-4000-8000-000000000109",
    label: "Illinois K-12 State Championship",
  },
  {
    match: /\bnew\s+jersey\s+state\s+scholastic\s+championships?\b/i,
    state: "NJ",
    seriesId: "00000000-0000-4000-8000-000000000110",
    label: "New Jersey State Scholastic Championship",
  },
  {
    match: /\bnorth\s+texas\s+scholastic\s+regional\b/i,
    state: "TX",
    seriesId: "00000000-0000-4000-8000-000000000111",
    label: "North Texas Scholastic Regional",
  },
  {
    match: /\bchicago\s+scholastic\s+championship\s+series\b/i,
    state: "IL",
    seriesId: "00000000-0000-4000-8000-000000000112",
    label: "Chicago Scholastic Championship Series",
  },
];

export function matchSeriesId(
  name: string,
  state: string
): { seriesId: string; label: string } | null {
  const st = state.toUpperCase();
  for (const rule of SERIES_MATCH_RULES) {
    if (rule.state && rule.state !== st) continue;
    if (rule.match.test(name)) return { seriesId: rule.seriesId, label: rule.label };
  }
  return null;
}

/**
 * Set series_id on competitions that are still null and match a rule.
 * Never overwrites an existing series_id (human curation wins).
 */
export async function attachSeriesMatches(
  client: SupabaseClient,
  competitionIds?: string[]
): Promise<number> {
  const idChunks = competitionIds?.length
    ? chunkIds(competitionIds)
    : [null as string[] | null];

  let attached = 0;
  for (const ids of idChunks) {
    let query = client
      .from("competitions")
      .select("id, name, state, series_id")
      .is("series_id", null);

    if (ids?.length) {
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(`series match lookup failed: ${error.message}`);

    for (const row of data ?? []) {
      const hit = matchSeriesId(row.name as string, row.state as string);
      if (!hit) continue;
      const { error: updErr } = await client
        .from("competitions")
        .update({ series_id: hit.seriesId })
        .eq("id", row.id)
        .is("series_id", null);
      if (updErr) {
        console.warn(`series attach failed for ${row.id}: ${updErr.message}`);
        continue;
      }
      attached += 1;
    }

    // No id filter → single full scan is enough.
    if (!ids) break;
  }
  return attached;
}
