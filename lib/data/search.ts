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

/** Shared post-filter sort used by mock + supabase search. */
export function sortCompetitionResults(
  results: CompetitionResult[],
  filters: SearchFilters
): void {
  results.sort((a, b) => {
    if (filters.q) {
      const rankDelta =
        competitionNameRank(a.name, filters.q) - competitionNameRank(b.name, filters.q);
      if (rankDelta !== 0) return rankDelta;
    }
    if (a.distance_miles !== null && b.distance_miles !== null) {
      if (Math.abs(a.distance_miles - b.distance_miles) > 0.5) {
        return a.distance_miles - b.distance_miles;
      }
    }
    return a.start_date.localeCompare(b.start_date);
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
