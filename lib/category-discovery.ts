import type { CompetitionCategory } from "@/lib/schemas";

export type DiscoveryCategory = Exclude<CompetitionCategory, "other">;

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
      "Search the official public listings Causey has indexed so far. Coverage currently relies on a limited set of Tabroom calendars and may omit circuits, events, or late changes.",
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
        name: "Tabroom",
        href: "https://www.tabroom.com/index/index.mhtml",
        status: "Active for the configured Texas public circuit",
        note: "Official public tournament calendars. Causey indexes only configured public circuits and does not claim complete Tabroom coverage.",
      },
    ],
    referenceSources: [
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
      "Search the official public listings Causey has indexed so far. Robotics coverage starts with VEX Events; science fair and mathematics coverage remains limited.",
    searchPlaceholder: "Try robotics, science fair, or a competition name",
    facetLabel: "Discipline",
    facets: [
      { value: "robotics", label: "Robotics" },
      { value: "science_fair", label: "Science fair" },
      { value: "mathematics", label: "Mathematics" },
    ],
    activeSources: [
      {
        name: "VEX Events",
        href: "https://events.vex.com/robot-competitions/vex-robotics-competition",
        status: "Blocked: repository fetch received HTTP 403 on August 12, 2026",
        note: "Official public VEX event pages. The parser is covered by a truthful public-page snippet, but automated refresh remains disabled unless normal public access succeeds without a bypass.",
      },
    ],
    referenceSources: [
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
    ],
  },
  {
    id: "arts",
    label: "Arts",
    href: "/arts",
    heading: "Student arts competitions.",
    description:
      "Search the official public listings Causey has indexed so far. Current coverage is limited to published TAEA VASE dates and may not include every regional update.",
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

export function discoveryCategory(
  category: CompetitionCategory
): CategoryDiscoveryDefinition | null {
  if (category === "other") return null;
  return DISCOVERY_BY_ID.get(category) ?? null;
}

export function isDiscoveryCategory(
  category: CompetitionCategory
): category is DiscoveryCategory {
  return discoveryCategory(category) !== null;
}

export function facetBelongsToCategory(
  category: CompetitionCategory | undefined,
  facet: string
): boolean {
  if (!category) return false;
  return discoveryCategory(category)?.facets.some((option) => option.value === facet) ?? false;
}
