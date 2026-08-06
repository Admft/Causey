import {
  CompetitionSchema,
  DEFAULT_SEARCH_LIMIT,
  SectionSchema,
  SeriesSchema,
  type Competition,
  type SearchFilters,
  type Section,
} from "@/lib/schemas";
import { haversineMiles } from "@/lib/geo";
import {
  competitionNameRank,
  competitionInDateWindow,
  matchingSectionIds,
} from "@/lib/data/filtering";
import type { CompetitionResult, CompetitionSearchPage } from "@/lib/data/types";

const POPULARITY_DISTANCE_BAND_MILES = 25;
export const ORG_MEMBER_INTEREST_BOOST = 2;

/** Shared post-filter sort used by mock + supabase search. */
export function sortCompetitionResults(
  results: CompetitionResult[],
  filters: SearchFilters,
  preferredOrgIds: ReadonlySet<string> = new Set()
): void {
  results.sort((a, b) => {
    if (filters.q) {
      const rankDelta =
        competitionNameRank(a.name, filters.q) - competitionNameRank(b.name, filters.q);
      if (rankDelta !== 0) return rankDelta;
    }

    const sort = filters.sort ?? "popular";

    if (sort === "soonest") {
      const dateDelta = a.start_date.localeCompare(b.start_date);
      if (dateDelta !== 0) return dateDelta;
    } else {
      // Keep nearby discovery useful: popularity only competes inside broad
      // distance bands rather than sending a far-away event to the top.
      if (a.distance_miles !== null && b.distance_miles !== null) {
        const distanceBandDelta =
          Math.floor(a.distance_miles / POPULARITY_DISTANCE_BAND_MILES) -
          Math.floor(b.distance_miles / POPULARITY_DISTANCE_BAND_MILES);
        if (distanceBandDelta !== 0) return distanceBandDelta;
      }

      // Give a member's organization a small, bounded lift. Public events
      // with stronger real interest still rank ahead, preserving discovery.
      const aMemberBoost =
        a.org_id && preferredOrgIds.has(a.org_id) ? ORG_MEMBER_INTEREST_BOOST : 0;
      const bMemberBoost =
        b.org_id && preferredOrgIds.has(b.org_id) ? ORG_MEMBER_INTEREST_BOOST : 0;
      const interestDelta =
        b.interest_count + bMemberBoost - (a.interest_count + aMemberBoost);
      if (interestDelta !== 0) return interestDelta;

      // On an equal boosted score, keep real interest as the tie-breaker.
      const realInterestDelta = b.interest_count - a.interest_count;
      if (realInterestDelta !== 0) return realInterestDelta;
    }

    if (a.distance_miles !== null && b.distance_miles !== null) {
      if (Math.abs(a.distance_miles - b.distance_miles) > 0.5) {
        return a.distance_miles - b.distance_miles;
      }
    }

    const dateDelta = a.start_date.localeCompare(b.start_date);
    if (dateDelta !== 0) return dateDelta;
    return a.id.localeCompare(b.id);
  });
}

export function paginateResults(
  results: CompetitionResult[],
  filters: SearchFilters
): CompetitionSearchPage {
  const limit = filters.limit ?? DEFAULT_SEARCH_LIMIT;
  const offset = filters.offset ?? 0;
  return {
    results: results.slice(offset, offset + limit),
    total: results.length,
    limit,
    offset,
  };
}

export function buildCompetitionResult(input: {
  competition: Competition;
  sections: Section[];
  series: unknown;
  distance_miles: number | null;
  filters: SearchFilters;
}): CompetitionResult | null {
  const { competition: c, sections: compSections, series: rawSeries, distance_miles, filters } =
    input;
  if (!competitionInDateWindow(c, filters)) return null;

  const matching = matchingSectionIds(c, compSections, filters);
  const hasSectionFilters =
    filters.grade_band || filters.rating_band || filters.max_fee_cents !== undefined;
  if (hasSectionFilters && matching.length === 0) return null;

  return {
    ...c,
    sections: compSections,
    series: rawSeries ? SeriesSchema.parse(rawSeries) : null,
    distance_miles,
    matching_section_ids: matching,
  };
}

export function parseCompetitionRow(row: Record<string, unknown>): {
  competition: Competition;
  sections: Section[];
  series: unknown;
} | null {
  if (row.canonical_id) return null;
  const { sections: rawSections, series: rawSeries, ...rawComp } = row;
  return {
    competition: CompetitionSchema.parse(rawComp),
    sections: ((rawSections as unknown[]) ?? []).map((s) => SectionSchema.parse(s)),
    series: rawSeries,
  };
}

/** Rough lat/lng window so zip searches don't download the whole country. */
export function radiusBoundingBox(
  lat: number,
  lng: number,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMiles / 69;
  const cos = Math.cos((lat * Math.PI) / 180);
  const lngDelta = radiusMiles / (69 * Math.max(cos, 0.2));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export { haversineMiles };
