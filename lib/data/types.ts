import type {
  Competition,
  QualificationRule,
  SearchFilters,
  Section,
  Series,
  ZipRow,
} from "@/lib/schemas";

/**
 * The single seam between the app and its storage. Two implementations:
 *
 *   lib/data/mock.ts      — in-process, reads /data/seed JSON. Default.
 *   lib/data/supabase.ts  — real Postgres via Supabase. Selected with
 *                           DATA_SOURCE=supabase.
 *
 * Pages and API routes import { getDataSource } from lib/data — never a
 * concrete implementation.
 */

/** A search hit: the competition plus its sections and computed extras. */
export interface CompetitionResult extends Competition {
  sections: Section[];
  series: Series | null;
  /** Present only when the search included a resolvable zip. */
  distance_miles: number | null;
  /** Sections that satisfy the active grade/rating/fee filters. */
  matching_section_ids: string[];
}

/** Paginated search response — tiles load in chunks, not all at once. */
export interface CompetitionSearchPage {
  results: CompetitionResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompetitionDetail extends Competition {
  sections: Section[];
  series: Series | null;
}

export interface CompetitionRef {
  id: string;
  slug: string;
  name: string;
  series_id: string | null;
  state: string;
  start_date: string;
}

export interface DataSource {
  /** Published competitions matching the filters, sorted distance → date. */
  searchCompetitions(filters: SearchFilters): Promise<CompetitionSearchPage>;
  getCompetitionBySlug(slug: string): Promise<CompetitionDetail | null>;
  /** Lightweight list for pickers (pathway explorer). */
  listCompetitionRefs(): Promise<CompetitionRef[]>;
  listSeries(): Promise<Series[]>;
  listQualificationRules(): Promise<QualificationRule[]>;
  /** null when the zip isn't in the zips table. */
  getZip(zip: string): Promise<ZipRow | null>;
}
