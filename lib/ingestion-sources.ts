import type { CompetitionCategory } from "@/lib/schemas";

/**
 * Per-site branding for scrapers / upcoming hubs.
 * Keep logos in public/sources/ and ids aligned with competitions.source
 * plus migration 0007 / 0019 ingestion_sources.
 */

export type IngestionSourceStatus = "live" | "soon";

export type IngestionSource = {
  id: string;
  /** Matches competitions.source when applicable. */
  competitionSource?:
    | "tla_scrape"
    | "cca_scrape"
    | "onlinereg_scrape"
    | "chess_results_scrape"
    | "fide_calendar_scrape"
    | "tca_scrape"
    | "tabroom_scrape"
    | "vex_events_scrape"
    | "taea_vase_scrape"
    | "bennington_writers_scrape"
    | "doe_science_bowl_scrape"
    | "afsa_essay_scrape"
    | "uil_theatre_scrape"
    | "uil_speech_debate_scrape";
  category: Exclude<CompetitionCategory, "other">;
  name: string;
  href: string;
  logoUrl: string;
  blurb: string;
  status: IngestionSourceStatus;
};

export const INGESTION_SOURCES: IngestionSource[] = [
  {
    id: "tla_scrape",
    competitionSource: "tla_scrape",
    name: "US Chess (TLA)",
    href: "https://new.uschess.org/upcoming-tournaments",
    logoUrl: "/sources/uschess.svg",
    blurb: "Official USCF-rated tournament directory.",
    status: "live",
    category: "chess",
  },
  {
    id: "cca_scrape",
    competitionSource: "cca_scrape",
    name: "Continental Chess (CCA)",
    href: "https://www.chesstour.com/refs.html",
    logoUrl: "/sources/cca.svg",
    blurb: "Major US opens — World Open, National Chess Congress, and more.",
    status: "live",
    category: "chess",
  },
  {
    id: "onlinereg_scrape",
    competitionSource: "onlinereg_scrape",
    name: "OnlineRegistration.cc",
    href: "https://onlineregistration.cc/tournaments/index.php",
    logoUrl: "/sources/onlinereg.svg",
    blurb: "Organizer registration hub used by many US events.",
    status: "live",
    category: "chess",
  },
  {
    id: "chess_results_scrape",
    competitionSource: "chess_results_scrape",
    name: "Chess-Results.com",
    href: "https://chess-results.com",
    logoUrl: "/sources/chess-results.svg",
    blurb:
      "Global pairings and results (Swiss-Manager). Causey indexes USA upcoming OTB events.",
    status: "live",
    category: "chess",
  },
  {
    id: "fide_calendar_scrape",
    competitionSource: "fide_calendar_scrape",
    name: "FIDE Calendar",
    href: "https://calendar.fide.com/calendar.php",
    logoUrl: "/sources/fide.svg",
    blurb:
      "Official international calendar — World events, Circuit, Continental stages.",
    status: "live",
    category: "chess",
  },
  {
    id: "tca_scrape",
    competitionSource: "tca_scrape",
    name: "Texas Chess Association",
    href: "https://texaschess.org/tca-and-tca-club-events/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Texas state-affiliate and club tournament announcements, with organizer pictures.",
    status: "live",
    category: "chess",
  },
  {
    id: "state_affiliates",
    name: "USCF state affiliates",
    href: "/sources/state-affiliates",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "All 50 states + DC — scholastic qualifiers and state championships. Opens a full directory.",
    status: "soon",
    category: "chess",
  },
  {
    id: "tabroom_scrape",
    competitionSource: "tabroom_scrape",
    name: "Tabroom",
    href: "https://www.tabroom.com/index/index.mhtml",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Reference link only. Primary Tabroom listings are archived; automated access and public reuse require written NSDA permission.",
    status: "soon",
    category: "debate",
  },
  {
    id: "vex_events_scrape",
    competitionSource: "vex_events_scrape",
    name: "VEX Events",
    href: "https://events.vex.com/robot-competitions/vex-robotics-competition",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official public VEX robotics event directory. Automated refresh is blocked by the source's current HTTP 403 response.",
    status: "soon",
    category: "stem",
  },
  {
    id: "doe_science_bowl_scrape",
    competitionSource: "doe_science_bowl_scrape",
    name: "DOE National Science Bowl",
    href: "https://science.osti.gov/wdts/nsb/Key-Dates",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official U.S. Department of Energy national-event dates, published from public-domain Office of Science information without implied endorsement.",
    status: "live",
    category: "stem",
  },
  {
    id: "taea_vase_scrape",
    competitionSource: "taea_vase_scrape",
    name: "TAEA VASE",
    href: "https://www.taea.org/vase/directors-dates.asp",
    logoUrl: "/sources/state-affiliates.svg",
    blurb: "Official public Visual Arts Scholastic Event dates.",
    status: "live",
    category: "arts",
  },
  {
    id: "uil_theatre_scrape",
    competitionSource: "uil_theatre_scrape",
    name: "UIL Theatre State Meets",
    href: "https://www.uiltexas.org/theatre/state",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official high-school theatre state-meet dates. Regional, district, zone, and local coverage is not included.",
    status: "live",
    category: "arts",
  },
  {
    id: "uil_speech_debate_scrape",
    competitionSource: "uil_speech_debate_scrape",
    name: "UIL Speech & Debate Invitationals",
    href: "https://www.uiltexas.org/academics/invitational-meets-test",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official UIL invitational calendar rows with explicit speech/debate offerings, exact dates, and complete Texas locations.",
    status: "live",
    category: "debate",
  },
  {
    id: "bennington_writers_scrape",
    competitionSource: "bennington_writers_scrape",
    name: "Bennington Young Writers Awards",
    href: "https://www.bennington.edu/events/young-writers-awards",
    logoUrl: "/sources/state-affiliates.svg",
    blurb: "Official public high-school writing award page.",
    status: "live",
    category: "writing",
  },
  {
    id: "afsa_essay_scrape",
    competitionSource: "afsa_essay_scrape",
    name: "AFSA National High School Essay Contest",
    href: "https://afsa.org/essay-contest",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official essay-contest cycles with exact AFSA-published deadlines and open or closed status.",
    status: "live",
    category: "writing",
  },
];

export function sourceByCompetitionSource(
  source: string
): IngestionSource | undefined {
  return INGESTION_SOURCES.find((s) => s.competitionSource === source);
}

export function sourceById(id: string): IngestionSource | undefined {
  return INGESTION_SOURCES.find((s) => s.id === id);
}

/** Plain-language filter options for competitions.source (search + admin). */
export const COMPETITION_SOURCE_FILTER_OPTIONS: {
  value: string;
  label: string;
}[] = [
  ...INGESTION_SOURCES.filter(
    (s) => s.competitionSource && s.status === "live"
  ).map((s) => ({
    value: s.competitionSource as string,
    label: s.name,
  })),
  { value: "organizer", label: "Provided by organizer" },
  { value: "manual", label: "Entered in Causey" },
];

export function competitionSourceLabel(source: string): string {
  return (
    COMPETITION_SOURCE_FILTER_OPTIONS.find((s) => s.value === source)?.label ??
    source
  );
}

export function isCompetitionSourceFilter(source: string): boolean {
  return COMPETITION_SOURCE_FILTER_OPTIONS.some((s) => s.value === source);
}

export function competitionSourceOptionsForCategory(
  category: CompetitionCategory
): { value: string; label: string }[] {
  return [
    ...INGESTION_SOURCES.filter(
      (source) =>
        source.category === category &&
        source.competitionSource &&
        source.status === "live"
    ).map((source) => ({
      value: source.competitionSource as string,
      label: source.name,
    })),
    { value: "organizer", label: "Provided by organizer" },
    { value: "manual", label: "Entered in Causey" },
  ];
}
