import type { CompetitionCategory } from "@/lib/schemas";

export const PUBLIC_DISCOVERY_CATEGORY_IDS = [
  "chess",
  "debate",
  "stem",
  "arts",
  "writing",
] as const;

export type DiscoveryCategory =
  (typeof PUBLIC_DISCOVERY_CATEGORY_IDS)[number];
export type PreferredCompetitionCategory = DiscoveryCategory | null;

export type CategoryFacet = {
  value: string;
  label: string;
};

export type CategorySource = {
  name: string;
  href: string;
  note: string;
  status?: string;
};

export type CategoryDiscoveryDefinition = {
  id: DiscoveryCategory;
  label: string;
  href: string;
  heading: string;
  description: string;
  searchPlaceholder: string;
  facetLabel?: string;
  facets: readonly CategoryFacet[];
  activeSources: readonly CategorySource[];
  referenceSources: readonly CategorySource[];
};

export const DISCOVERY_CATEGORIES: readonly CategoryDiscoveryDefinition[] = [
  {
    id: "chess",
    label: "Chess",
    href: "/chess",
    heading: "Scholastic chess tournaments near you.",
    description:
      "Search the chess events Causey has indexed so far. Coverage is growing and still incomplete; confirm fees, eligibility, and registration with the organizer.",
    searchPlaceholder: "Try World Open, state championship, or scholastic",
    facets: [],
    activeSources: [
      {
        name: "Causey chess feeds",
        href: "/chess#sources-heading",
        status: "Active",
        note: "Six active feeds are listed below, including US Chess, state, registration, results, and international calendars.",
      },
    ],
    referenceSources: [
      {
        name: "US Chess state affiliates",
        href: "/sources/state-affiliates",
        note: "Reference directory only. Most affiliate calendars are not indexed yet.",
      },
    ],
  },
  {
    id: "debate",
    label: "Speech & Debate",
    href: "/debate",
    heading: "Speech and debate tournaments.",
    description:
      "Search the official UIL invitational listings Causey has indexed so far. Coverage is limited to Texas rows that explicitly name speech or debate offerings and publish complete locations.",
    searchPlaceholder: "Try public forum, Lincoln-Douglas, or a tournament name",
    facetLabel: "Event type or format",
    facets: [
      { value: "public_forum", label: "Public Forum" },
      { value: "lincoln_douglas", label: "Lincoln-Douglas" },
      { value: "policy", label: "Policy" },
      { value: "congress", label: "Congress" },
      { value: "speech", label: "Speech" },
      { value: "world_schools", label: "World Schools" },
    ],
    activeSources: [
      {
        name: "UIL Speech & Debate Invitationals",
        href: "https://www.uiltexas.org/academics/invitational-meets-test",
        status: "Active for explicit 2026–27 Texas listings",
        note: "Causey indexes only UIL calendar rows with exact dates, complete Texas locations, and explicit speech/debate offerings. Third-party registration pages are not fetched.",
      },
    ],
    referenceSources: [
      {
        name: "Tabroom",
        href: "https://www.tabroom.com/index/index.mhtml",
        status: "Reference only",
        note: "NSDA terms apply to Tabroom and prohibit automated access plus commercial/public reuse. Previously indexed primary Tabroom listings are archived by migration 0051; Causey will not refresh or republish them without written permission.",
      },
      {
        name: "SpeechWire",
        href: "https://www.speechwire.com/",
        note: "Link only. Its terms prohibit automated indexing, so Causey does not scrape it.",
      },
    ],
  },
  {
    id: "stem",
    label: "STEM",
    href: "/stem",
    heading: "Student STEM competitions.",
    description:
      "Search the official public listings Causey has indexed so far. Current coverage includes National Science Bowl dates, the Purple Comet team mathematics window, and the Texas state science fair; robotics and regional fair coverage remains limited.",
    searchPlaceholder: "Try robotics, science fair, or a competition name",
    facetLabel: "Discipline",
    facets: [
      { value: "robotics", label: "Robotics" },
      { value: "science_fair", label: "Science fair" },
      { value: "mathematics", label: "Mathematics" },
      { value: "science_bowl", label: "Science bowl" },
    ],
    activeSources: [
      {
        name: "U.S. Department of Energy National Science Bowl",
        href: "https://science.osti.gov/wdts/nsb/Key-Dates",
        status: "Active for published national-event dates",
        note: "Official Office of Science dates and program information. DOE identifies the source material as public domain; Causey links to the source and does not imply DOE endorsement.",
      },
      {
        name: "Purple Comet! Math Meet",
        href: "https://www.purplecomet.org/",
        status: "Active for the published international contest window",
        note: "Official online team mathematics dates for middle- and high-school students. Causey retains factual event and eligibility metadata only, never contest problems, participant data, or login content.",
      },
      {
        name: "Texas Science & Engineering Fair",
        href: "https://txsef.tamu.edu/",
        status: "Active for the published 2027 state-fair dates",
        note: "Official Texas A&M dates and venue for grades 6–12 students who qualify through a Texas regional fair. Registration portals, fees, deadlines, and feeder-event dates are not indexed.",
      },
    ],
    referenceSources: [
      {
        name: "VEX Events",
        href: "https://events.vex.com/robot-competitions/vex-robotics-competition",
        status: "Not indexed: repository fetch received HTTP 403 on August 12, 2026",
        note: "Official public VEX event pages remain link-only unless normal public access succeeds without a bypass.",
      },
      {
        name: "FIRST",
        href: "https://www.firstinspires.org/",
        note: "Link only. API access requires a token and permission appropriate to the intended use.",
      },
      {
        name: "Society for Science fair finder",
        href: "https://findafair.societyforscience.org/",
        note: "Link only while Causey seeks permission for automated indexing.",
      },
      {
        name: "MATHCOUNTS competition search",
        href: "https://www.mathcounts.org/programs/chapter-state-competition-search",
        note: "Link only. MATHCOUNTS terms require prior written consent to reproduce or republish site materials.",
      },
      {
        name: "MAA American Mathematics Competitions",
        href: "https://maa.org/amcreg/",
        status: "Reference only",
        note: "The official page publishes current AMC dates, but ordinary access to MAA's site-wide Terms of Use returned HTTP 403 during review. Causey will not automate for-profit public reuse without reliable permission evidence.",
      },
      {
        name: "MathWorks Math Modeling Challenge",
        href: "https://m3challenge.siam.org/the-challenge/",
        status: "Reference only: 2027 dates not yet official",
        note: "The first-party page describes an online high-school competition but does not yet publish a complete 2027 challenge window.",
      },
    ],
  },
  {
    id: "arts",
    label: "Arts",
    href: "/arts",
    heading: "Student arts competitions.",
    description:
      "Search the official public listings Causey has indexed so far. Current coverage includes published TAEA VASE dates, UIL theatre state meets, and UIL state open-class marching band dates; regional, district, zone, area, local, and other music coverage remains incomplete.",
    searchPlaceholder: "Try visual arts, music, theatre, or an event name",
    facetLabel: "Discipline",
    facets: [
      { value: "visual_arts", label: "Visual arts" },
      { value: "music", label: "Music" },
      { value: "theatre", label: "Theatre" },
    ],
    activeSources: [
      {
        name: "TAEA VASE",
        href: "https://www.taea.org/vase/directors-dates.asp",
        status: "Active",
        note: "Official public Visual Arts Scholastic Event dates. Causey indexes only dates with enough published detail to identify an event.",
      },
      {
        name: "UIL Theatre State Meets",
        href: "https://www.uiltexas.org/theatre/state",
        status: "Active for published state-meet dates",
        note: "Official high-school One-Act Play and Theatrical Design state-meet dates. Causey does not imply complete UIL theatre coverage and does not index regional, district, zone, or local events.",
      },
      {
        name: "UIL State Open Class Marching Band",
        href: "https://www.uiltexas.org/music/marching-band/state",
        status: "Active for published state open-class dates",
        note: "Official conference-group dates at the Alamodome. Causey does not index area, region, local, military-class, or other UIL music contests from this source.",
      },
    ],
    referenceSources: [
      {
        name: "Scholastic Art & Writing Awards",
        href: "https://www.artandwriting.org/",
        note: "Link only. Its terms prohibit automated indexing.",
      },
      {
        name: "YoungArts",
        href: "https://youngarts.org/",
        note: "Link only. Its terms prohibit automated indexing.",
      },
    ],
  },
  {
    id: "writing",
    label: "Writing",
    href: "/writing",
    heading: "Student writing competitions.",
    description:
      "Search the official public opportunities Causey has indexed so far. Coverage is intentionally small, and dates remain unpublished until an organizer gives a specific year.",
    searchPlaceholder: "Try poetry, fiction, nonfiction, or an award name",
    facetLabel: "Genre",
    facets: [
      { value: "essay", label: "Essay" },
      { value: "fiction", label: "Fiction" },
      { value: "poetry", label: "Poetry" },
      { value: "nonfiction", label: "Nonfiction" },
    ],
    activeSources: [
      {
        name: "Bennington Young Writers Awards",
        href: "https://www.bennington.edu/events/young-writers-awards",
        status: "Active adapter; waiting for a year-specific cycle",
        note: "Official public award page. Causey publishes a listing only when the page names a complete, year-specific cycle.",
      },
    ],
    referenceSources: [
      {
        name: "Scholastic Art & Writing Awards",
        href: "https://www.artandwriting.org/",
        note: "Link only. Its terms prohibit automated indexing.",
      },
      {
        name: "NewPages",
        href: "https://www.newpages.com/writers-resources/young-writers-guide/",
        note: "Secondary reference directory only; Causey does not ingest it as an official source.",
      },
    ],
  },
] as const;

const DISCOVERY_BY_ID = new Map(
  DISCOVERY_CATEGORIES.map((category) => [category.id, category])
);

export function parseDiscoveryCategory(
  value: unknown
): DiscoveryCategory | null {
  return typeof value === "string" &&
    PUBLIC_DISCOVERY_CATEGORY_IDS.some((category) => category === value)
    ? (value as DiscoveryCategory)
    : null;
}

export function discoveryCategory(
  category: CompetitionCategory
): CategoryDiscoveryDefinition | null {
  const publicCategory = parseDiscoveryCategory(category);
  return publicCategory ? DISCOVERY_BY_ID.get(publicCategory) ?? null : null;
}

export function isDiscoveryCategory(
  category: unknown
): category is DiscoveryCategory {
  return parseDiscoveryCategory(category) !== null;
}

export function discoveryCategoryHref(
  category: DiscoveryCategory,
  params?: URLSearchParams | Record<string, string | null | undefined>
): string {
  const href = DISCOVERY_BY_ID.get(category)?.href ?? "/";
  if (!params) return href;
  const search =
    params instanceof URLSearchParams
      ? new URLSearchParams(params)
      : new URLSearchParams(
          Object.entries(params).flatMap(([key, value]) =>
            value ? [[key, value]] : []
          )
        );
  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

export function discoveryCategoryLabel(category: DiscoveryCategory): string {
  return DISCOVERY_BY_ID.get(category)?.label ?? category;
}

export function preferredDiscoveryHref(
  category: PreferredCompetitionCategory,
  params?: URLSearchParams | Record<string, string | null | undefined>
): string {
  return category ? discoveryCategoryHref(category, params) : "/";
}

export function facetValuesForCategory(
  category: CompetitionCategory
): readonly string[] {
  return discoveryCategory(category)?.facets.map((facet) => facet.value) ?? [];
}

export function facetBelongsToCategory(
  category: CompetitionCategory | undefined,
  facet: string
): boolean {
  if (!category) return false;
  return facetValuesForCategory(category).includes(facet);
}
