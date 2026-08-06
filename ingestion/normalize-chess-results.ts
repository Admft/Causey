import { CompetitionSchema, type Competition } from "../lib/schemas";
import { NEEDS_REVIEW, slugify, stateToCode } from "./normalize";
import type { RawChessResultsEvent } from "./parse-chess-results";

export const CHESS_RESULTS_SCRAPER_ID = "chess_results_scrape" as const;
export const CHESS_RESULTS_LISTING_URL =
  "https://chess-results.com/TurnierSuche.aspx?lan=1";

/** Pull city / state / zip from Chess-Results location cells. */
export function parseChessResultsLocation(locationText: string): {
  city: string;
  state: string;
  zip: string | null;
  address: string | null;
} {
  const t = locationText.replace(/\s+/g, " ").trim();
  if (!t) return { city: "Unknown", state: "XX", zip: null, address: null };

  const zip = t.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
  const stateCode = t.match(/\b([A-Z]{2})\b(?!.*\b[A-Z]{2}\b)/)?.[1];
  // "Houston, TX 77009" / "Traverse City, MI" / "New York City"
  const cityState = t.match(/^([^,]+),\s*([A-Z]{2})\b/i);
  if (cityState) {
    return {
      city: cityState[1].trim(),
      state: cityState[2].toUpperCase(),
      zip,
      address: zip ? t : null,
    };
  }
  if (stateCode && stateToCode(stateCode)) {
    const city = t.split(",")[0]?.trim() || "Unknown";
    return { city, state: stateCode.toUpperCase(), zip, address: zip ? t : null };
  }
  return {
    city: t.split(",")[0]?.trim() || "Unknown",
    state: "XX",
    zip,
    address: null,
  };
}

/**
 * Standing hint from size / name — not a prestige score.
 * Large player fields and invitational / international names rise;
 * tiny club events stay local.
 */
export function chessResultsStandingHint(raw: RawChessResultsEvent): string {
  const name = raw.name;
  if (/\b(world|olympiad|candidates|grand\s+swiss|sinquefield)\b/i.test(name)) {
    return "international";
  }
  if (/\b(national|u\.?\s*s\.?\s*open|international)\b/i.test(name)) {
    return "national_or_major";
  }
  if ((raw.playerCount ?? 0) >= 100) return "major_field";
  if ((raw.playerCount ?? 0) >= 40) return "solid_open";
  if (/\b(quad|blitz|rapid|club|scholastic|camp)\b/i.test(name)) return "local";
  return "local";
}

export type NormalizeChessResultsOptions = {
  id: string;
  coords?: { lat: number; lng: number } | null;
};

export function normalizeRawChessResults(
  raw: RawChessResultsEvent,
  opts: NormalizeChessResultsOptions
): Competition | null {
  // Product filter: USA OTB discovery only for this hub.
  if (raw.federation && raw.federation !== "USA") return null;
  if (/\bcorrespondence\b/i.test(raw.name)) return null;
  if (/^countries\s+part\b/i.test(raw.name)) return null;
  if (/^test(\s*\d+)?$/i.test(raw.name.trim())) return null;

  const loc = parseChessResultsLocation(raw.locationText);
  const state = loc.state;
  const zip = loc.zip && /^\d{5}$/.test(loc.zip) ? loc.zip : NEEDS_REVIEW.zip;
  // Keep unresolved locations as draft (state XX / missing zip) — never invent DC.
  const ready =
    zip !== NEEDS_REVIEW.zip && Boolean(opts.coords) && state !== "XX";

  const draft = {
    id: opts.id,
    slug: slugify(raw.name, raw.startDate) + `-cr${raw.externalKey}`,
    name: raw.name,
    category: "chess",
    organizer_name: null,
    venue_name: null,
    address: loc.address,
    city: loc.city.slice(0, 80) || "Unknown",
    state,
    zip,
    lat: opts.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: opts.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: raw.startDate,
    end_date: raw.endDate,
    reg_deadline: null,
    reg_url: raw.detailUrl,
    entry_fee_cents: null,
    rated: true,
    rating_system: "fide",
    series_id: null,
    source: CHESS_RESULTS_SCRAPER_ID,
    source_url: raw.detailUrl,
    image_url: null,
    pathway_status: "none" as const,
    pathway_summary: null,
    pathway_related: [],
    visibility: "public" as const,
    audience: "public" as const,
    org_id: null,
    created_by: null,
    details: {
      catalog_standing: chessResultsStandingHint(raw),
      time_control: raw.timeControl,
      player_count: raw.playerCount,
      round_count: raw.roundCount,
      federation: raw.federation,
      chess_results_tnr: raw.externalKey,
      location_raw: raw.locationText,
    },
    interest_count: 0,
    status: ready ? ("published" as const) : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(draft);
  if (!parsed.success) {
    console.warn(`chess-results normalize zod fail: ${raw.name}`, parsed.error.issues[0]);
    return null;
  }
  return parsed.data;
}
