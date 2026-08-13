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

export const CompetitionStatus = z.enum([
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
]);

export const CompetitionAudienceSchema = z.enum([
  "public",
  "district",
  "school",
  "invite_only",
]);

export const CompetitionCategorySchema = z.enum([
  "chess",
  "stem",
  "debate",
  "arts",
  "writing",
  "other",
]);

export const ParticipationModeSchema = z.enum([
  "in_person",
  "online",
  "hybrid",
]);

export const CompetitionSourceSchema = z.enum([
  "manual",
  "tla_scrape",
  "cca_scrape",
  "organizer",
  "onlinereg_scrape",
  "chess_results_scrape",
  "fide_calendar_scrape",
  "tca_scrape",
  "tabroom_scrape",
  "vex_events_scrape",
  "taea_vase_scrape",
  "bennington_writers_scrape",
  "doe_science_bowl_scrape",
  "afsa_essay_scrape",
  "uil_theatre_scrape",
  "uil_speech_debate_scrape",
  "purple_comet_scrape",
  "uil_music_marching_scrape",
  "txsef_scrape",
]);

export const TournamentSectionDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  minRating: z.number().int().nonnegative().nullable(),
  maxRating: z.number().int().nonnegative().nullable(),
  minGrade: z.number().int().min(0).max(12).nullable(),
  maxGrade: z.number().int().min(0).max(12).nullable(),
  entryFeeCents: z.number().int().nonnegative().nullable(),
});

/**
 * In-progress organizer input. Drafts deliberately accept incomplete values so
 * a coach can leave at any point and resume without relying on browser storage.
 */
export const TournamentDraftDataSchema = z.object({
  category: CompetitionCategorySchema.default("chess"),
  customCategoryName: z.string().trim().max(80).default(""),
  participationMode: ParticipationModeSchema.default("in_person"),
  name: z.string().max(120).default(""),
  startDate: z.string().max(10).default(""),
  endDate: z.string().max(10).default(""),
  regDeadline: z.string().max(10).default(""),
  venueName: z.string().max(120).default(""),
  address: z.string().max(160).default(""),
  city: z.string().max(80).default(""),
  state: z.string().max(2).default(""),
  zip: z.string().max(5).default(""),
  entryFee: z.string().max(20).default(""),
  regUrl: z.string().max(2048).default(""),
  visibility: z.enum(["public", "private"]).default("private"),
  audience: CompetitionAudienceSchema.optional(),
  sections: z.array(TournamentSectionDraftSchema).max(20).optional(),
  rated: z.boolean().default(false),
});

/** Pathway honesty for scraped events — default majority is none. */
export const PathwayStatusSchema = z.enum(["none", "uncertain", "known"]);

export const PathwayRelatedSchema = z.object({
  name: z.string().min(1),
  note: z.string().optional(),
});

export const CompetitionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: CompetitionCategorySchema.default("chess"),
  custom_category_name: z.string().trim().min(1).max(80).nullable().default(null),
  participation_mode: ParticipationModeSchema.default("in_person"),
  organizer_name: z.string().nullable(),
  venue_name: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().length(2).nullable(),
  zip: z.string().regex(/^\d{5}$/).nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reg_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** null = no external registration — org events RSVP on Causey instead. */
  reg_url: z.string().url().nullable(),
  /** null = fee not listed on source; 0 = explicitly free. */
  entry_fee_cents: z.number().int().nonnegative().nullable(),
  rated: z.boolean(),
  rating_system: z.string().nullable().default("uschess"),
  series_id: z.string().uuid().nullable(),
  /**
   * Which ingestion pipeline wrote this row.
   * - manual: hand-entered / seed
   * - tla_scrape: US Chess upcoming-tournaments scraper
   * - cca_scrape: Continental Chess Association (chesstour.com)
   * - organizer: coach-hosted / partner feeds
   * - onlinereg_scrape | chess_results_scrape | fide_calendar_scrape | tca_scrape: hub scrapers
   */
  source: CompetitionSourceSchema,
  /** Exact upstream page the scraper read (null for hand-entered rows). */
  source_url: z.string().url().nullable().default(null),
  /**
   * Optional cover from the event/organizer page. Null is normal — UI must
   * not reserve empty image chrome when missing.
   */
  image_url: z.string().url().nullable().default(null),
  /**
   * Cross-source identity (ingestion/fingerprint.ts). Null until a scrape
   * stamps it. Search ignores rows with canonical_id set (archived dupes).
   */
  fingerprint: z.string().nullable().optional(),
  canonical_id: z.string().uuid().nullable().optional(),
  /**
   * Pathway enrichment (ingestion/enrich-pathways.ts). Scrapers leave defaults;
   * upsert must not wipe these on every scrape.
   */
  pathway_status: PathwayStatusSchema.default("none"),
  pathway_summary: z.string().nullable().optional().default(null),
  pathway_related: z.array(PathwayRelatedSchema).optional().default([]),
  pathway_input_hash: z.string().nullable().optional(),
  pathway_model: z.string().nullable().optional(),
  pathway_enriched_at: z.string().nullable().optional(),
  /**
   * Multi-tenant visibility. Scraped events are always public.
   * Coach-hosted private events require org membership (RLS).
   */
  visibility: z.enum(["public", "private"]).default("public"),
  audience: CompetitionAudienceSchema.default("public"),
  org_id: z.string().uuid().nullable().optional().default(null),
  created_by: z.string().uuid().nullable().optional().default(null),
  /** Category-specific extras (STEM/debate later) without new columns. */
  details: z
    .record(z.unknown())
    .nullish()
    .transform((v) => v ?? {}),
  /** Distinct users who saved or started registering for this tournament. */
  interest_count: z.number().int().nonnegative().default(0),
  status: CompetitionStatus.default("published"),
}).superRefine((competition, context) => {
  if (
    competition.category === "other" &&
    !competition.custom_category_name
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["custom_category_name"],
      message: "Other competitions need a custom type name.",
    });
  }
  if (
    competition.category !== "other" &&
    competition.custom_category_name !== null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["custom_category_name"],
      message: "Custom type names are only valid for Other.",
    });
  }
  if (
    competition.participation_mode !== "online" &&
    (!competition.city ||
      !competition.state ||
      !competition.zip ||
      competition.lat === null ||
      competition.lng === null)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["city"],
      message: "In-person and hybrid competitions need a complete location.",
    });
  }
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
export type SeriesLevel = z.infer<typeof SeriesLevel>;
export type CompetitionAudience = z.infer<typeof CompetitionAudienceSchema>;
export type CompetitionCategory = z.infer<typeof CompetitionCategorySchema>;
export type ParticipationMode = z.infer<typeof ParticipationModeSchema>;
export type Competition = z.infer<typeof CompetitionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type QualificationRule = z.infer<typeof QualificationRuleSchema>;
export type ZipRow = z.infer<typeof ZipSchema>;
export type PathwayStatus = z.infer<typeof PathwayStatusSchema>;
export type PathwayRelated = z.infer<typeof PathwayRelatedSchema>;
export type TournamentDraftData = z.infer<typeof TournamentDraftDataSchema>;
export type TournamentSectionDraft = z.infer<typeof TournamentSectionDraftSchema>;

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

export const SearchSortSchema = z.enum(["popular", "soonest"]);
export type SearchSort = z.infer<typeof SearchSortSchema>;

export const CompetitionFacetSchema = z.enum([
  "public_forum",
  "lincoln_douglas",
  "policy",
  "congress",
  "speech",
  "world_schools",
  "robotics",
  "science_fair",
  "mathematics",
  "science_bowl",
  "visual_arts",
  "music",
  "theatre",
  "essay",
  "fiction",
  "poetry",
  "nonfiction",
]);

const CATEGORY_FACETS: Partial<
  Record<CompetitionCategory, readonly z.infer<typeof CompetitionFacetSchema>[]>
> = {
  debate: [
    "public_forum",
    "lincoln_douglas",
    "policy",
    "congress",
    "speech",
    "world_schools",
  ],
  stem: ["robotics", "science_fair", "mathematics", "science_bowl"],
  arts: ["visual_arts", "music", "theatre"],
  writing: ["essay", "fiction", "poetry", "nonfiction"],
};

export const SearchFiltersSchema = z.object({
  category: CompetitionCategorySchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  radius_miles: z.coerce.number().positive().max(3000).optional(),
  state: z.string().length(2).optional(),
  /** Which scrape hub wrote the row — e.g. tla_scrape (US Chess), cca_scrape. */
  source: CompetitionSourceSchema.optional(),
  /** Only national / international / named major opens (award-tier). */
  featured: z
    .union([z.literal("1"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "1" || v === "true"),
  grade_band: z.enum(["k3", "k6", "k8", "hs"]).optional(),
  rating_band: z.enum(["unrated", "u800", "u1200", "u1600", "open"]).optional(),
  /** Category-specific normalized value stored in competitions.details.facets. */
  facet: CompetitionFacetSchema.optional(),
  max_fee_cents: z.coerce.number().int().nonnegative().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /**
   * Calendar slice: upcoming (default) = not yet ended; ended = past end;
   * all = both. End date is end_date ?? start_date.
   */
  timing: z.enum(["upcoming", "ended", "all"]).optional().default("upcoming"),
  /** Popular defaults to real saved/registration interest; soonest is explicit. */
  sort: SearchSortSchema.optional().default("popular"),
  /** Page size for tile loading. Defaults to 20; max 2000 (for “load all”). */
  limit: z.coerce.number().int().positive().max(2000).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
}).superRefine((filters, context) => {
  if (filters.rating_band && filters.category && filters.category !== "chess") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rating_band"],
      message: "Rating bands are available only for chess.",
    });
  }
  if (filters.featured && filters.category && filters.category !== "chess") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["featured"],
      message: "Featured chess standing is available only for chess.",
    });
  }
  if (
    filters.facet &&
    (!filters.category ||
      !CATEGORY_FACETS[filters.category]?.includes(filters.facet))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["facet"],
      message: "That facet does not belong to the selected competition type.",
    });
  }
});
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const DEFAULT_SEARCH_LIMIT = 20;
/** Cap used when the UI asks for every matching row. */
export const SEARCH_LOAD_ALL_LIMIT = 2000;
