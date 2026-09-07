import type { DiscoveryCategoryId } from "./categories";

/** Same calendar slice as website SearchFilters. */
export type TimingFilter = "upcoming" | "ended" | "all";
export type SearchSort = "soonest" | "popular";

export type AdvancedFilters = {
  timing: TimingFilter;
  state: string;
  source: string;
  featured: boolean;
  clubGoing: boolean;
  gradeBand: string;
  ratingBand: string;
  facet: string;
  maxFeeDollars: string;
  dateFrom: string;
  dateTo: string;
};

export const EMPTY_ADVANCED: AdvancedFilters = {
  timing: "upcoming",
  state: "",
  source: "",
  featured: false,
  clubGoing: false,
  gradeBand: "",
  ratingBand: "",
  facet: "",
  maxFeeDollars: "",
  dateFrom: "",
  dateTo: "",
};

export const TIMING_OPTIONS: { value: TimingFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ended", label: "Ended" },
  { value: "all", label: "Both" },
];

export const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "soonest", label: "Soonest" },
  { value: "popular", label: "Popular" },
];

export const RADIUS_OPTIONS = ["10", "25", "50", "100", "250"] as const;
export const DEFAULT_RADIUS = "50";

export const GRADE_OPTIONS = [
  { value: "", label: "Any grade" },
  { value: "k3", label: "K–3" },
  { value: "k6", label: "K–6" },
  { value: "k8", label: "K–8" },
  { value: "hs", label: "High school (9–12)" },
] as const;

export const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "unrated", label: "Unrated" },
  { value: "u800", label: "Under 800" },
  { value: "u1200", label: "800–1199" },
  { value: "u1600", label: "1200–1599" },
  { value: "open", label: "1600+" },
] as const;

export const FEE_OPTIONS = [
  { value: "", label: "Any fee" },
  { value: "25", label: "$25 or less" },
  { value: "40", label: "$40 or less" },
  { value: "60", label: "$60 or less" },
  { value: "100", label: "$100 or less" },
] as const;

export const STATE_OPTIONS = [
  { value: "", label: "All states" },
  ...["AZ", "CA", "FL", "IL", "MO", "NJ", "NY", "TX"].map((state) => ({
    value: state,
    label: state,
  })),
];

const ORGANIZER_SOURCES = [
  { value: "organizer", label: "Provided by organizer" },
  { value: "manual", label: "Entered in Causey" },
] as const;

/** Live listing sources from website SearchFilters, plus organizer/manual. */
const SOURCES_BY_CATEGORY: Record<
  DiscoveryCategoryId,
  { value: string; label: string }[]
> = {
  chess: [
    { value: "tla_scrape", label: "US Chess (TLA)" },
    { value: "cca_scrape", label: "Continental Chess (CCA)" },
    { value: "onlinereg_scrape", label: "OnlineRegistration.cc" },
    { value: "chess_results_scrape", label: "Chess-Results.com" },
    { value: "fide_calendar_scrape", label: "FIDE Calendar" },
    { value: "tca_scrape", label: "Texas Chess Association" },
    ...ORGANIZER_SOURCES,
  ],
  debate: [
    { value: "uil_speech_debate_scrape", label: "UIL Speech & Debate Invitationals" },
    ...ORGANIZER_SOURCES,
  ],
  stem: [
    { value: "doe_science_bowl_scrape", label: "DOE National Science Bowl" },
    { value: "purple_comet_scrape", label: "Purple Comet! Math Meet" },
    { value: "txsef_scrape", label: "Texas Science & Engineering Fair" },
    { value: "congressional_app_challenge_scrape", label: "Congressional App Challenge" },
    { value: "hack_club_hackathons_scrape", label: "Hack Club Hackathons" },
    ...ORGANIZER_SOURCES,
  ],
  arts: [
    { value: "taea_vase_scrape", label: "TAEA VASE" },
    { value: "uil_theatre_scrape", label: "UIL Theatre State Meets" },
    {
      value: "uil_music_marching_scrape",
      label: "UIL State Open Class Marching Band",
    },
    ...ORGANIZER_SOURCES,
  ],
  writing: [
    {
      value: "bennington_writers_scrape",
      label: "Bennington Young Writers Awards",
    },
    {
      value: "afsa_essay_scrape",
      label: "AFSA National High School Essay Contest",
    },
    ...ORGANIZER_SOURCES,
  ],
};

export type FacetOption = {
  value: string;
  label: string;
  parent?: string;
};

type FacetCatalog = {
  label: string;
  options: FacetOption[];
};

const FACETS_BY_CATEGORY: Partial<Record<DiscoveryCategoryId, FacetCatalog>> = {
  debate: {
    label: "Event type or format",
    options: [
      { value: "public_forum", label: "Public Forum" },
      { value: "lincoln_douglas", label: "Lincoln-Douglas" },
      { value: "policy", label: "Policy" },
      { value: "congress", label: "Congress" },
      { value: "speech", label: "Speech" },
      { value: "world_schools", label: "World Schools" },
    ],
  },
  stem: {
    label: "Discipline",
    options: [
      { value: "robotics", label: "Robotics" },
      { value: "science_fair", label: "Science fair" },
      { value: "mathematics", label: "Mathematics" },
      { value: "science_bowl", label: "Science bowl" },
      { value: "biology", label: "Biology" },
      { value: "chemistry", label: "Chemistry" },
      { value: "physics", label: "Physics" },
      { value: "engineering", label: "Engineering" },
      { value: "computer_science", label: "Computer science" },
      { value: "math_team", label: "Team contest", parent: "mathematics" },
      { value: "math_contest", label: "Individual contest", parent: "mathematics" },
      { value: "math_modeling", label: "Modeling", parent: "mathematics" },
    ],
  },
  arts: {
    label: "Discipline",
    options: [
      { value: "visual_arts", label: "Visual arts" },
      { value: "music", label: "Music" },
      { value: "theatre", label: "Theatre" },
    ],
  },
  writing: {
    label: "Genre",
    options: [
      { value: "essay", label: "Essay" },
      { value: "fiction", label: "Fiction" },
      { value: "poetry", label: "Poetry" },
      { value: "nonfiction", label: "Nonfiction" },
    ],
  },
};

export function sourceOptions(
  category: DiscoveryCategoryId
): { value: string; label: string }[] {
  return [{ value: "", label: "Any source" }, ...SOURCES_BY_CATEGORY[category]];
}

export function facetCatalog(
  category: DiscoveryCategoryId
): FacetCatalog | null {
  return FACETS_BY_CATEGORY[category] ?? null;
}

export function primaryFacets(category: DiscoveryCategoryId): FacetOption[] {
  return (FACETS_BY_CATEGORY[category]?.options ?? []).filter(
    (facet) => !facet.parent
  );
}

export function childFacets(
  category: DiscoveryCategoryId,
  parent: string
): FacetOption[] {
  return (FACETS_BY_CATEGORY[category]?.options ?? []).filter(
    (facet) => facet.parent === parent
  );
}

export function advancedCount(filters: AdvancedFilters): number {
  return (
    (filters.featured ? 1 : 0) +
    (filters.clubGoing ? 1 : 0) +
    (filters.timing !== "upcoming" ? 1 : 0) +
    (filters.state ? 1 : 0) +
    (filters.source ? 1 : 0) +
    (filters.gradeBand ? 1 : 0) +
    (filters.ratingBand ? 1 : 0) +
    (filters.facet ? 1 : 0) +
    (filters.maxFeeDollars ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0)
  );
}

export function orgGoingFilterLabel(types: Iterable<string>): string {
  const kinds = new Set(
    [...types].map((type) =>
      type === "school" || type === "team" || type === "district" ? type : "club"
    )
  );
  const hasSchool = kinds.has("school");
  const hasClubOrTeam = kinds.has("club") || kinds.has("team");
  if (hasSchool && !hasClubOrTeam) return "My school is going";
  if (!hasSchool && hasClubOrTeam) return "My club is going";
  return "My organization is going";
}

export function filtersForCategory(
  filters: AdvancedFilters,
  category: DiscoveryCategoryId
): AdvancedFilters {
  return {
    ...filters,
    featured: category === "chess" ? filters.featured : false,
    ratingBand: category === "chess" ? filters.ratingBand : "",
    source: sourceOptions(category).some((row) => row.value === filters.source)
      ? filters.source
      : "",
    facet: (FACETS_BY_CATEGORY[category]?.options ?? []).some(
      (row) => row.value === filters.facet
    )
      ? filters.facet
      : "",
  };
}
