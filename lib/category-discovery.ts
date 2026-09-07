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
  /** Parent facet value; children also match when the parent is selected. */
  parent?: string;
  /** UI grouping. Default "discipline". */
  group?: "discipline" | "math_type" | "format" | "genre";
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
  /** Compact label for space-constrained chrome (mobile header nav). */
  shortLabel: string;
  href: string;
  heading: string;
  description: string;
  /** Empty-results guidance naming what this directory actually covers. */
  emptyDescription: string;
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
    shortLabel: "Chess",
    href: "/chess",
    heading: "Scholastic chess tournaments near you.",
    description:
      "Search the chess events Causey has indexed so far. Coverage is growing and still incomplete; confirm fees, eligibility, and registration with the organizer.",
    emptyDescription:
      "Try widening the radius, raising the fee ceiling, or clearing a filter. State championships may be farther away.",
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
    shortLabel: "Debate",
    href: "/debate",
    heading: "Speech and debate tournaments.",
    description:
      "Search the official UIL invitational listings Causey has indexed so far. Coverage is limited to Texas rows that explicitly name speech or debate offerings and publish complete locations.",
    emptyDescription:
      "Causey currently indexes only UIL invitational rows with explicit speech or debate offerings, so many real tournaments are not listed here yet. Try widening the radius or switching Timing to All, and use the reference links below for wider coverage.",
    searchPlaceholder: "Try public forum, Lincoln-Douglas, or a tournament name",
    facetLabel: "Event type or format",
    facets: [
      { value: "public_forum", label: "Public Forum", group: "format" },
      { value: "lincoln_douglas", label: "Lincoln-Douglas", group: "format" },
      { value: "policy", label: "Policy", group: "format" },
      { value: "congress", label: "Congress", group: "format" },
      { value: "speech", label: "Speech", group: "format" },
      { value: "world_schools", label: "World Schools", group: "format" },
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
    shortLabel: "STEM",
    href: "/stem",
    heading: "Student STEM competitions.",
    description:
      "Search the official public listings Causey has indexed so far. Filter by discipline — mathematics, biology, science fair, and others — without assuming every tag has published rows yet. Current coverage includes the Purple Comet team mathematics window, DOE National Science Bowl national dates, the Texas state science fair, and the Congressional App Challenge national submission window.",
    emptyDescription:
      "Published STEM coverage is currently limited to Purple Comet, DOE National Science Bowl national dates, the Texas state science fair, and the Congressional App Challenge national submission window. Biology and other discipline filters may be empty until a source publishes that tag. Try clearing filters or switching Timing to All.",
    searchPlaceholder: "Try mathematics, biology, robotics, or a competition name",
    facetLabel: "Discipline",
    facets: [
      { value: "robotics", label: "Robotics", group: "discipline" },
      { value: "science_fair", label: "Science fair", group: "discipline" },
      { value: "mathematics", label: "Mathematics", group: "discipline" },
      { value: "science_bowl", label: "Science bowl", group: "discipline" },
      { value: "biology", label: "Biology", group: "discipline" },
      { value: "chemistry", label: "Chemistry", group: "discipline" },
      { value: "physics", label: "Physics", group: "discipline" },
      { value: "engineering", label: "Engineering", group: "discipline" },
      { value: "computer_science", label: "Computer science", group: "discipline" },
      {
        value: "math_team",
        label: "Team contest",
        parent: "mathematics",
        group: "math_type",
      },
      {
        value: "math_contest",
        label: "Individual contest",
        parent: "mathematics",
        group: "math_type",
      },
      {
        value: "math_modeling",
        label: "Modeling",
        parent: "mathematics",
        group: "math_type",
      },
    ],
    activeSources: [
      {
        name: "Purple Comet! Math Meet",
        href: "https://www.purplecomet.org/",
        status: "Active for the published international contest window",
        note: "Official online team mathematics dates for middle- and high-school students. Causey retains factual event and eligibility metadata only, never contest problems, participant data, or login content.",
      },
      {
        name: "U.S. Department of Energy National Science Bowl",
        href: "https://science.osti.gov/wdts/nsb/Key-Dates",
        status: "Active for published national-event dates",
        note: "Official Office of Science national dates in Washington, D.C. Regional qualifying bowls, registration portals, and fees are not indexed. Causey uses no DOE or National Science Bowl logo.",
      },
      {
        name: "Texas Science & Engineering Fair",
        href: "https://txsef.tamu.edu/",
        status: "Active for the published 2027 state-fair dates",
        note: "Official Texas A&M dates and venue for grades 6–12 students who qualify through a Texas regional fair. Registration portals, fees, deadlines, and feeder-event dates are not indexed.",
      },
      {
        name: "Congressional App Challenge",
        href: "https://www.congressionalappchallenge.us/students/participating-districts/",
        status: "Active for the published 2026 national submission window",
        note: "Official House-coordinated student app challenge. Causey indexes one national May–October submission window for middle and high school students in participating districts. It does not list each district as a separate event, fetch registration portals, or copy the member table.",
      },
    ],
    referenceSources: [
      {
        name: "VEX Events",
        href: "https://events.vex.com/robot-competitions/vex-robotics-competition",
        status: "Not indexed: ordinary public requests still return HTTP 403",
        note: "The public directory currently serves a Cloudflare challenge. Causey will not bypass that; official VEX pages remain link-only until ordinary access succeeds.",
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
      {
        name: "Science Olympiad invitationals",
        href: "https://www.soinc.org/play/invitationals",
        status: "Not indexed",
        note: "soinc.org Terms limit use to personal non-commercial viewing and forbid republishing site content without written permission. No invitational or state-site scrape until they say yes.",
      },
      {
        name: "USA Computing Olympiad",
        href: "https://usaco.org",
        status: "Reference only",
        note: "Ordinary homepage requests currently hit a Cloudflare challenge, and the public recap is not a complete next-season window. Dates and official URL only if access and terms later allow; never problems or logins.",
      },
      {
        name: "Hack Club Hackathons",
        href: "https://hackathons.hackclub.com/data/",
        status: "Eligible later, not indexed yet",
        note: "Documented public JSON API; credit “Hack Club Hackathons” with a link and do not take logos. Any future adapter would keep virtual events plus US in-person rows that resolve a ZIP.",
      },
    ],
  },
  {
    id: "arts",
    label: "Arts",
    shortLabel: "Arts",
    href: "/arts",
    heading: "Student arts competitions.",
    description:
      "Search the official public listings Causey has indexed so far. Visual arts, music, and theatre share this directory — use the discipline chips to separate them. Current coverage includes published TAEA VASE dates, UIL theatre state meets, and UIL state open-class marching band dates.",
    emptyDescription:
      "Arts coverage is currently limited to published TAEA VASE dates plus UIL state theatre and marching band dates. Switch to Music or Theatre to hide the other discipline, or try Timing: All.",
    searchPlaceholder: "Try visual arts, music, theatre, or an event name",
    facetLabel: "Discipline",
    facets: [
      { value: "visual_arts", label: "Visual arts", group: "discipline" },
      { value: "music", label: "Music", group: "discipline" },
      { value: "theatre", label: "Theatre", group: "discipline" },
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
    shortLabel: "Writing",
    href: "/writing",
    heading: "Student writing competitions.",
    description:
      "Search the official public opportunities Causey has indexed so far. There are no upcoming published writing rows today; the ended 2025–26 AFSA essay cycle remains available under Timing: All.",
    emptyDescription:
      "There are no upcoming published writing rows today. Switch Timing to All to review the ended 2025–26 AFSA essay cycle; future listings publish only when an organizer names a complete, year-specific cycle.",
    searchPlaceholder: "Try poetry, fiction, nonfiction, or an award name",
    facetLabel: "Genre",
    facets: [
      { value: "essay", label: "Essay", group: "genre" },
      { value: "fiction", label: "Fiction", group: "genre" },
      { value: "poetry", label: "Poetry", group: "genre" },
      { value: "nonfiction", label: "Nonfiction", group: "genre" },
    ],
    activeSources: [
      {
        name: "AFSA National High School Essay Contest",
        href: "https://afsa.org/essay-contest",
        status: "Indexed ended 2025–26 cycle",
        note: "The official year-specific cycle is retained under Timing: All. Its March 1, 2026 deadline is not presented as an upcoming event or open application.",
      },
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
      {
        name: "Poetry Out Loud",
        href: "https://www.poetryoutloud.org/key-dates/",
        status: "Not indexed",
        note: "poetryoutloud.org is governed by Mid Atlantic Arts Terms: non-commercial use only, no republishing without permission. National dates stay link-only until they grant a listing license; no state-coordinator fan-out.",
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

export function discoveryCategoryShortLabel(
  category: DiscoveryCategory
): string {
  return DISCOVERY_BY_ID.get(category)?.shortLabel ?? category;
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

export function primaryFacetsForCategory(
  category: CompetitionCategory
): readonly CategoryFacet[] {
  return (
    discoveryCategory(category)?.facets.filter((facet) => !facet.parent) ?? []
  );
}

/** Null when the type has no organizer discipline, format, or genre chips. */
export function requiredOrganizerFacetMessage(
  category: CompetitionCategory
): string | null {
  if (primaryFacetsForCategory(category).length === 0) return null;
  const label = discoveryCategory(category)?.facetLabel ?? "Discipline";
  return `${label} is required.`;
}

export function childFacetsFor(
  category: CompetitionCategory,
  parentValue: string
): readonly CategoryFacet[] {
  return (
    discoveryCategory(category)?.facets.filter(
      (facet) => facet.parent === parentValue
    ) ?? []
  );
}

export function facetBelongsToCategory(
  category: CompetitionCategory | undefined,
  facet: string
): boolean {
  if (!category) return false;
  return facetValuesForCategory(category).includes(facet);
}

export function facetSelectionMatches(
  category: CompetitionCategory,
  selected: string,
  stored: readonly string[] | undefined
): boolean {
  if (!selected) return true;
  if (!facetBelongsToCategory(category, selected)) return false;
  const values = stored ?? [];
  const children = childFacetsFor(category, selected).map((facet) => facet.value);
  if (children.length === 0) return values.includes(selected);
  return values.includes(selected) || children.some((child) => values.includes(child));
}

export function formatCompetitionFacetLabel(
  category: CompetitionCategory,
  stored: readonly string[] | undefined
): string | null {
  const definition = discoveryCategory(category);
  if (!definition || !stored?.length) return null;
  const byValue = new Map(
    definition.facets.map((facet) => [facet.value, facet])
  );
  const ordered = [
    ...stored.filter((value) => !byValue.get(value)?.parent),
    ...stored.filter((value) => byValue.get(value)?.parent),
  ];
  const labels = ordered
    .map((value) => byValue.get(value)?.label)
    .filter((label): label is string => Boolean(label));
  return labels.length ? [...new Set(labels)].join(" · ") : null;
}

export function storedFacetsForOrganizer(
  category: CompetitionCategory,
  primaryFacet: string,
  mathTypeFacet: string
): string[] {
  if (!primaryFacet || !facetBelongsToCategory(category, primaryFacet)) {
    return [];
  }
  const facets = [primaryFacet];
  if (
    mathTypeFacet &&
    facetBelongsToCategory(category, mathTypeFacet) &&
    childFacetsFor(category, primaryFacet).some(
      (facet) => facet.value === mathTypeFacet
    )
  ) {
    facets.push(mathTypeFacet);
  }
  return facets;
}

export function organizerPrimaryFacet(
  category: CompetitionCategory,
  stored: readonly string[] | undefined
): string {
  const values = stored ?? [];
  const primary = primaryFacetsForCategory(category).find((facet) =>
    values.includes(facet.value)
  );
  if (primary) return primary.value;
  const child = discoveryCategory(category)?.facets.find(
    (facet) => facet.parent && values.includes(facet.value)
  );
  return child?.parent ?? "";
}

export function organizerMathTypeFacet(
  category: CompetitionCategory,
  stored: readonly string[] | undefined
): string {
  const primary = organizerPrimaryFacet(category, stored);
  if (!primary) return "";
  return (
    childFacetsFor(category, primary).find((facet) =>
      (stored ?? []).includes(facet.value)
    )?.value ?? ""
  );
}
