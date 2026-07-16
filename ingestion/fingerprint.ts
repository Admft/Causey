/**
 * Cross-source event identity. Same physical tournament from TLA and CCA
 * should share one fingerprint so we can collapse duplicates in search.
 */
export function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(the|a|an|chess|tournament|championships?|open|scholastic|invitational)\b/g,
      " "
    )
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
  state: string;
  zip?: string | null;
}): string {
  const name = normalizeEventName(input.name);
  const state = input.state.trim().toUpperCase();
  const zip =
    input.zip && /^\d{5}$/.test(input.zip) && input.zip !== "00000"
      ? input.zip
      : null;
  return zip
    ? `${name}|${input.start_date}|${state}|${zip}`
    : `${name}|${input.start_date}|${state}`;
}

/** Prefer US Chess (TLA) as the canonical listing when sources collide. */
export const SOURCE_PRIORITY: Record<string, number> = {
  tla_scrape: 40,
  cca_scrape: 30,
  organizer: 20,
  manual: 10,
};
