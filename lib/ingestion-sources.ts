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
    | "tca_scrape";
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
  },
  {
    id: "cca_scrape",
    competitionSource: "cca_scrape",
    name: "Continental Chess (CCA)",
    href: "https://www.chesstour.com/refs.html",
    logoUrl: "/sources/cca.svg",
    blurb: "Major US opens — World Open, National Chess Congress, and more.",
    status: "live",
  },
  {
    id: "onlinereg_scrape",
    competitionSource: "onlinereg_scrape",
    name: "OnlineRegistration.cc",
    href: "https://onlineregistration.cc/tournaments/index.php",
    logoUrl: "/sources/onlinereg.svg",
    blurb: "Organizer registration hub used by many US events.",
    status: "live",
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
  },
  {
    id: "state_affiliates",
    name: "USCF state affiliates",
    href: "/sources/state-affiliates",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "All 50 states + DC — scholastic qualifiers and state championships. Opens a full directory.",
    status: "soon",
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
  ...INGESTION_SOURCES.filter((s) => s.competitionSource).map((s) => ({
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
