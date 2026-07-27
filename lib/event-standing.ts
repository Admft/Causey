import type { Series, SeriesLevel } from "@/lib/schemas";

/**
 * How "big" / official an event is — for parents scanning search results.
 * Derived from curated series.level when linked; otherwise name + source
 * heuristics. Default is local/open (honest majority). Not a prestige score.
 *
 * Featured (award mark): international, national, and named major opens.
 * Automated — scrapers attach series_id / names; the UI derives the mark.
 */

export type EventStandingId =
  | "international"
  | "national"
  | "state"
  | "regional"
  | "major_open"
  | "local";

export type EventStanding = {
  id: EventStandingId;
  /** Short label for cards / meta rows. */
  label: string;
  /** One sentence for the event page. */
  hint: string;
};

const FROM_SERIES_LEVEL: Record<SeriesLevel, EventStanding> = {
  international: {
    id: "international",
    label: "International",
    hint: "International championship or FIDE-level event. Strong players travel for these.",
  },
  national: {
    id: "national",
    label: "National",
    hint: "National championship or invitational. Often the top of a state pathway.",
  },
  state: {
    id: "state",
    label: "State championship",
    hint: "State-level championship. Often the gate to national invitationals.",
  },
  local: {
    id: "regional",
    label: "Regional",
    hint: "Regional or circuit event. Bigger than a club swiss; may feed a state championship.",
  },
};

/** Named majors that aren't always series-linked yet (esp. CCA opens). */
const MAJOR_OPEN =
  /\b(world\s+open|national\s+chess\s+congress|north\s+american\s+open|chicago\s+open|philadelphia\s+open|eastern\s+open|western\s+class|national\s+open|u\.?\s*s\.?\s*open|super\s*nationals?|pan[- ]am)\b/i;

const STATE_CHAMP =
  /\b(state\s+(scholastic\s+)?champ(ionship)?|scholastic\s+championship)\b/i;

const NATIONAL_NAME =
  /\b(denker|barber|rockefeller|haring|u\.?\s*s\.?\s*junior|national\s+invitational|all[- ]america)\b/i;

const REGIONAL_NAME =
  /\b(regional|qualifier|qualifying|district|sectionals?)\b/i;

const LOCAL_OPEN =
  /\b(swiss|g\/\d+|quad|blitz|rapid|club|weekend|action|cash\s+prize)\b/i;

const FEATURED_STANDINGS = new Set<EventStandingId>([
  "international",
  "national",
  "major_open",
]);

/** Award mark for the top-tier events only. */
export function isFeaturedStanding(standing: EventStanding): boolean {
  return FEATURED_STANDINGS.has(standing.id);
}

/** Convenience for search filters — same rules as the award mark. */
export function competitionIsFeatured(input: {
  name: string;
  source: string;
  series: Pick<Series, "level" | "name"> | null;
}): boolean {
  return isFeaturedStanding(eventStanding(input));
}

export function eventStanding(input: {
  name: string;
  source: string;
  series: Pick<Series, "level" | "name"> | null;
}): EventStanding {
  if (input.series) {
    return FROM_SERIES_LEVEL[input.series.level];
  }

  const name = input.name;

  if (NATIONAL_NAME.test(name)) {
    return FROM_SERIES_LEVEL.national;
  }
  if (MAJOR_OPEN.test(name)) {
    return {
      id: "major_open",
      label: "Major open",
      hint: "Large open with national draw. Not a scholastic pathway seat by itself, but a serious field.",
    };
  }
  if (STATE_CHAMP.test(name)) {
    return FROM_SERIES_LEVEL.state;
  }
  if (REGIONAL_NAME.test(name)) {
    return FROM_SERIES_LEVEL.local;
  }
  if (LOCAL_OPEN.test(name) || input.source === "tla_scrape" || input.source === "cca_scrape") {
    return {
      id: "local",
      label: "Local / open",
      hint: "Local club or open event. Fine for rated games and practice — usually not a national qualifier seat.",
    };
  }

  return {
    id: "local",
    label: "Local / open",
    hint: "Local club or open event. Fine for rated games and practice — usually not a national qualifier seat.",
  };
}
