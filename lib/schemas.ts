import { z } from "zod";

/**
 * Zod schemas for every record the app touches. Field names are snake_case on
 * purpose: they match the Postgres schema in supabase/migrations/0001_init.sql
 * and the seed JSON exactly, so rows flow between mock mode, Supabase, and the
 * ingestion pipeline with zero mapping code.
 */

export const SeriesLevel = z.enum(["local", "state", "national", "international"]);

export const SeriesSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  level: SeriesLevel,
});

export const CompetitionStatus = z.enum(["draft", "published", "archived"]);

export const CompetitionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().default("chess"),
  organizer_name: z.string().nullable(),
  venue_name: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string(),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}$/),
  lat: z.number(),
  lng: z.number(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reg_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reg_url: z.string().url(),
  entry_fee_cents: z.number().int().nonnegative(),
  rated: z.boolean(),
  rating_system: z.string().default("uschess"),
  series_id: z.string().uuid().nullable(),
  /**
   * Which ingestion pipeline wrote this row.
   * - manual: hand-entered / seed
   * - tla_scrape: US Chess upcoming-tournaments scraper
   * - cca_scrape: Continental Chess Association (chesstour.com)
   * - organizer: future partner / registration-platform feeds
   */
  source: z.enum(["manual", "tla_scrape", "cca_scrape", "organizer"]),
  /** Exact upstream page the scraper read (null for hand-entered rows). */
  source_url: z.string().url().nullable().default(null),
  status: CompetitionStatus.default("published"),
});

export const SectionSchema = z.object({
  id: z.string().uuid(),
  competition_id: z.string().uuid(),
  name: z.string().min(1),
  min_rating: z.number().int().nullable(),
  max_rating: z.number().int().nullable(),
  // Grades are 0–12 where 0 = Kindergarten.
  min_grade: z.number().int().min(0).max(12).nullable(),
  max_grade: z.number().int().min(0).max(12).nullable(),
  min_age: z.number().int().nullable(),
  max_age: z.number().int().nullable(),
  gender_restriction: z.enum(["girls"]).nullable(),
  residency_state: z.string().length(2).nullable(),
  // Overrides the competition-level fee when set.
  entry_fee_cents: z.number().int().nonnegative().nullable(),
});

export const QualificationRuleSchema = z.object({
  id: z.string().uuid(),
  // Exactly one of from_series_id / from_competition_id should be set.
  from_series_id: z.string().uuid().nullable(),
  from_competition_id: z.string().uuid().nullable(),
  // 1 = must win, 3 = top three, etc.
  required_placement: z.number().int().positive(),
  to_series_id: z.string().uuid(),
  // Citation / source for the rule. Rules change yearly; never ship one
  // without a note saying where it came from.
  notes: z.string().min(1),
  verified_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ZipSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  lat: z.number(),
  lng: z.number(),
});

export type Series = z.infer<typeof SeriesSchema>;
export type Competition = z.infer<typeof CompetitionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type QualificationRule = z.infer<typeof QualificationRuleSchema>;
export type ZipRow = z.infer<typeof ZipSchema>;

/** Grade bands offered as search filters. Values are inclusive grade ranges. */
export const GRADE_BANDS = {
  k3: { label: "K–3", min: 0, max: 3 },
  k6: { label: "K–6", min: 0, max: 6 },
  k8: { label: "K–8", min: 0, max: 8 },
  hs: { label: "High school (9–12)", min: 9, max: 12 },
} as const;
export type GradeBand = keyof typeof GRADE_BANDS;

/**
 * Rating bands describe the player, not the section: a band matches every
 * section a player rated in that range could enter (an 900-rated player
 * matches a U1200 section and an open Championship section, not a U800 one).
 */
export const RATING_BANDS = {
  unrated: { label: "Unrated", min: 0, max: 0 },
  u800: { label: "Under 800", min: 1, max: 799 },
  u1200: { label: "800–1199", min: 800, max: 1199 },
  u1600: { label: "1200–1599", min: 1200, max: 1599 },
  open: { label: "1600+", min: 1600, max: 3000 },
} as const;
export type RatingBand = keyof typeof RATING_BANDS;

export const SearchFiltersSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  radius_miles: z.coerce.number().positive().max(3000).optional(),
  state: z.string().length(2).optional(),
  grade_band: z.enum(["k3", "k6", "k8", "hs"]).optional(),
  rating_band: z.enum(["unrated", "u800", "u1200", "u1600", "open"]).optional(),
  max_fee_cents: z.coerce.number().int().nonnegative().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
