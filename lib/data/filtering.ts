import {
  GRADE_BANDS,
  RATING_BANDS,
  type Competition,
  type SearchFilters,
  type Section,
} from "@/lib/schemas";

/**
 * Section-level eligibility matching, shared by both DataSource
 * implementations. Competition-level predicates (state, dates, radius) are
 * cheap to push into SQL; section matching stays in one place here so mock
 * and Supabase modes can never disagree about what "eligible" means.
 */

function rangesIntersect(
  aMin: number,
  aMax: number,
  bMin: number | null,
  bMax: number | null
): boolean {
  return (bMin ?? Number.NEGATIVE_INFINITY) <= aMax && (bMax ?? Number.POSITIVE_INFINITY) >= aMin;
}

export function sectionMatchesFilters(
  section: Section,
  competition: Competition,
  filters: SearchFilters
): boolean {
  if (filters.grade_band) {
    const band = GRADE_BANDS[filters.grade_band];
    if (!rangesIntersect(band.min, band.max, section.min_grade, section.max_grade)) {
      return false;
    }
  }

  if (filters.rating_band) {
    if (filters.rating_band === "unrated") {
      // Unrated players can enter sections with no rating floor.
      if (section.min_rating !== null && section.min_rating > 0) return false;
    } else {
      const band = RATING_BANDS[filters.rating_band];
      if (!rangesIntersect(band.min, band.max, section.min_rating, section.max_rating)) {
        return false;
      }
    }
  }

  if (filters.max_fee_cents !== undefined) {
    const fee = section.entry_fee_cents ?? competition.entry_fee_cents;
    if (fee > filters.max_fee_cents) return false;
  }

  return true;
}

export function matchingSectionIds(
  competition: Competition,
  sections: Section[],
  filters: SearchFilters
): string[] {
  return sections
    .filter((s) => sectionMatchesFilters(s, competition, filters))
    .map((s) => s.id);
}

/** Date-window predicate on the competition row. */
export function competitionInDateWindow(
  competition: Competition,
  filters: SearchFilters
): boolean {
  if (filters.date_from && competition.start_date < filters.date_from) return false;
  if (filters.date_to && competition.start_date > filters.date_to) return false;
  return true;
}
