/**
 * Cross-source event identity. Same physical tournament from TLA and CCA
 * should share one fingerprint so we can collapse duplicates in search.
 */
export function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    // Keep open / championship / scholastic — stripping them collided
    // Dallas Open with Dallas Championship on the same weekend.
    .replace(/\b(the|a|an|chess|tournament|invitational)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * fingerprint = normalized name | start_date | state [| zip when known]
 * Zip is omitted when it's the 00000 review sentinel so draft rows can still
 * match once location is filled.
 */
export function eventFingerprint(input: {
  name: string;
  start_date: string;
  state: string | null;
  zip?: string | null;
  category?: string | null;
}): string {
  const name = normalizeEventName(input.name);
  const state = (input.state ?? "").trim().toUpperCase();
  const zip =
    input.zip && /^\d{5}$/.test(input.zip) && input.zip !== "00000"
      ? input.zip
      : null;
  const identity = zip
    ? `${name}|${input.start_date}|${state}|${zip}`
    : `${name}|${input.start_date}|${state}`;
  return input.category && input.category !== "chess"
    ? `${input.category}|${identity}`
    : identity;
}

/** Prefer US Chess (TLA) as the canonical listing when sources collide. */
export const SOURCE_PRIORITY: Record<string, number> = {
  tla_scrape: 40,
  tca_scrape: 38,
  fide_calendar_scrape: 35,
  cca_scrape: 30,
  onlinereg_scrape: 25,
  chess_results_scrape: 22,
  tabroom_scrape: 30,
  vex_events_scrape: 30,
  taea_vase_scrape: 30,
  bennington_writers_scrape: 30,
  doe_science_bowl_scrape: 30,
  afsa_essay_scrape: 30,
  uil_theatre_scrape: 30,
  uil_speech_debate_scrape: 30,
  purple_comet_scrape: 30,
  uil_music_marching_scrape: 30,
  txsef_scrape: 30,
  congressional_app_challenge_scrape: 30,
  hack_club_hackathons_scrape: 30,
  organizer: 20,
  manual: 10,
};
