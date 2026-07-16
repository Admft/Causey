/**
 * Public-facing list of tournament hubs Causey indexes (or will index).
 * Keep in sync with data/tournament-sources.txt and data/state-affiliates.txt.
 */

export type TournamentSourceStatus = "live" | "soon";

export type TournamentSource = {
  name: string;
  href: string;
  blurb: string;
  status: TournamentSourceStatus;
};

/** National / registration hubs shown on the product site. */
export const TOURNAMENT_SOURCES: TournamentSource[] = [
  {
    name: "US Chess (TLA)",
    href: "https://new.uschess.org/upcoming-tournaments",
    blurb: "Official USCF-rated tournament directory.",
    status: "live",
  },
  {
    name: "Continental Chess (CCA)",
    href: "https://www.chesstour.com/refs.html",
    blurb: "Major US opens — World Open, National Chess Congress, and more.",
    status: "live",
  },
  {
    name: "OnlineRegistration.cc",
    href: "https://onlineregistration.cc",
    blurb: "Organizer registration hub used by many US events.",
    status: "soon",
  },
  {
    name: "Chess-Results.com",
    href: "https://chess-results.com",
    blurb: "Global pairings and results (Swiss-Manager publishes here).",
    status: "soon",
  },
  {
    name: "FIDE Calendar",
    href: "https://fide.com/calendar",
    blurb: "Official international events — World Cup, Candidates, Grand Swiss.",
    status: "soon",
  },
  {
    name: "USCF state affiliates",
    href: "/sources/state-affiliates",
    blurb:
      "All 50 states + DC — scholastic qualifiers and state championships. Opens a full directory.",
    status: "soon",
  },
];

export const LIVE_SOURCES = TOURNAMENT_SOURCES.filter((s) => s.status === "live");
export const SOON_SOURCES = TOURNAMENT_SOURCES.filter((s) => s.status === "soon");
