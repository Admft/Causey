/**
 * Per-site branding for scrapers / upcoming hubs.
 * Keep logos in public/sources/ and ids aligned with competitions.source
 * plus migration 0007 ingestion_sources.
 */

export type IngestionSourceStatus = "live" | "soon";

export type IngestionSource = {
  id: string;
  /** Matches competitions.source when applicable. */
  competitionSource?: "tla_scrape" | "cca_scrape";
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
    id: "onlinereg",
    name: "OnlineRegistration.cc",
    href: "https://onlineregistration.cc",
    logoUrl: "/sources/onlinereg.svg",
    blurb: "Organizer registration hub used by many US events.",
    status: "soon",
  },
  {
    id: "chess_results",
    name: "Chess-Results.com",
    href: "https://chess-results.com",
    logoUrl: "/sources/chess-results.svg",
    blurb: "Global pairings and results (Swiss-Manager publishes here).",
    status: "soon",
  },
  {
    id: "fide_calendar",
    name: "FIDE Calendar",
    href: "https://fide.com/calendar",
    logoUrl: "/sources/fide.svg",
    blurb: "Official international events — World Cup, Candidates, Grand Swiss.",
    status: "soon",
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
