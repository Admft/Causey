import { stateToCode } from "./normalize";
import type { RawCategoryEvent } from "./category-source-types";

export const HACK_CLUB_HACKATHONS_API_URL =
  "https://hackathons.hackclub.com/api/events/upcoming/";
export const HACK_CLUB_HACKATHONS_CREDIT_URL =
  "https://hackathons.hackclub.com/";
export const HACK_CLUB_HACKATHONS_DOCS_URL =
  "https://hackathons.hackclub.com/data/";

function isoDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function publicHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isUnitedStates(event: {
  country?: unknown;
  countryCode?: unknown;
}): boolean {
  const code =
    typeof event.countryCode === "string" ? event.countryCode.trim() : "";
  if (code.toUpperCase() === "US") return true;
  const country =
    typeof event.country === "string" ? event.country.trim().toLowerCase() : "";
  return country === "united states" || country === "usa";
}

/**
 * Documented Hack Club Hackathons JSON. Credit required:
 * “Hack Club Hackathons” with a link to hackathons.hackclub.com.
 * Virtual events plus US in-person/hybrid rows with a city and state.
 * International in-person rows, logos, and banners are dropped.
 */
export function parseHackClubHackathonsJson(
  jsonText: string
): RawCategoryEvent[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const events: RawCategoryEvent[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const event = row as Record<string, unknown>;
    const id = typeof event.id === "string" ? event.id.trim() : "";
    const name = typeof event.name === "string" ? event.name.trim() : "";
    const startDate = isoDay(event.start);
    const endDate = isoDay(event.end);
    const status =
      typeof event.status === "string" ? event.status.trim().toLowerCase() : "";
    if (!id || !name || !startDate) continue;
    if (status && status !== "published") continue;
    if (endDate && endDate < startDate) continue;

    const virtual = event.virtual === true;
    const hybrid = event.hybrid === true;
    const website = publicHttpUrl(event.website);
    const city = typeof event.city === "string" ? event.city.trim() : "";
    const state = typeof event.state === "string" ? stateToCode(event.state) : null;

    let participationMode: RawCategoryEvent["participationMode"];
    let listedCity: string | null = null;
    let listedState: string | null = null;
    if (virtual) {
      participationMode = "online";
    } else if (!isUnitedStates(event) || !city || !state) {
      continue;
    } else {
      participationMode = hybrid ? "hybrid" : "in_person";
      listedCity = city;
      listedState = state;
    }

    events.push({
      externalKey: id,
      name,
      detailUrl: website ?? HACK_CLUB_HACKATHONS_CREDIT_URL,
      registrationUrl: website,
      startDate,
      endDate,
      regDeadline: null,
      participationMode,
      venueName: null,
      address: null,
      city: listedCity,
      state: listedState,
      zip: null,
      facets: ["computer_science"],
      eventType: "High-school hackathon",
      availability:
        "listed on Hack Club Hackathons (https://hackathons.hackclub.com/); high-school directory, factual dates and location only",
      entryFeeCents: null,
    });
  }
  return events;
}
