import { CompetitionSchema, type Competition } from "../lib/schemas";
import { NEEDS_REVIEW, slugify, stateToCode } from "./normalize";
import type { RawChessResultsEvent } from "./parse-chess-results";
import type { GeoPrecision } from "./geo";

export const CHESS_RESULTS_SCRAPER_ID = "chess_results_scrape" as const;
export const CHESS_RESULTS_LISTING_URL =
  "https://chess-results.com/TurnierSuche.aspx?lan=1";

const STREET_TOKEN =
  /\b(ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|hwy|highway|pkwy|parkway|suite|ste|apt|unit|floor|fl|#)\b/i;

/**
 * Pull city / state / zip from Chess-Results location cells.
 * Prefer the last ZIP; never treat a street number as a ZIP.
 */
export function parseChessResultsLocation(locationText: string): {
  city: string;
  state: string;
  zip: string | null;
  address: string | null;
} {
  const t = locationText.replace(/\s+/g, " ").trim();
  if (!t) return { city: "Unknown", state: "XX", zip: null, address: null };

  const zip = pickPostalZip(t);

  // "Houston, TX 77009" / "Traverse City, MI" / "Austin, Texas"
  const cityStateZip = t.match(
    /,\s*([A-Za-z]{2}|[A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\s*(?:\d{5}(?:-\d{4})?)?\s*(?:,\s*USA)?\s*$/i
  );
  if (cityStateZip) {
    const stateRaw = cityStateZip[1];
    const state = stateToCode(stateRaw) ?? (/^[A-Z]{2}$/i.test(stateRaw) ? stateRaw.toUpperCase() : null);
    if (state) {
      const before = t.slice(0, cityStateZip.index).trim().replace(/,\s*$/, "");
      // Prefer segment immediately before ", ST" as city; earlier bits are venue/street.
      const segments = before.split(",").map((s) => s.trim()).filter(Boolean);
      let city = "Unknown";
      let address: string | null = null;
      if (segments.length === 0) {
        city = "Unknown";
      } else if (segments.length === 1) {
        city = looksLikeStreet(segments[0]!) ? "Unknown" : segments[0]!;
        address = looksLikeStreet(segments[0]!) ? t : zip ? t : null;
      } else {
        // Last segment before state is usually the city; earlier = venue / street.
        const last = segments[segments.length - 1]!;
        if (looksLikeStreet(last) && segments.length >= 2) {
          city = segments[segments.length - 2]!;
          address = t;
        } else {
          city = last;
          address = segments.length > 1 || zip ? t : null;
        }
      }
      return {
        city: city.slice(0, 80) || "Unknown",
        state,
        zip,
        address,
      };
    }
  }

  // Fallback: last 2-letter state code in the string
  const stateCodes = [...t.matchAll(/\b([A-Z]{2})\b/g)].map((m) => m[1]!);
  for (let i = stateCodes.length - 1; i >= 0; i -= 1) {
    const code = stateCodes[i]!;
    if (!stateToCode(code)) continue;
    const idx = t.lastIndexOf(code);
    const before = t.slice(0, idx).replace(/[,\s]+$/, "");
    const segments = before.split(",").map((s) => s.trim()).filter(Boolean);
    const city =
      segments.length === 0
        ? "Unknown"
        : looksLikeStreet(segments[segments.length - 1]!) && segments.length >= 2
          ? segments[segments.length - 2]!
          : segments[segments.length - 1]!;
    return {
      city: (looksLikeStreet(city) ? "Unknown" : city).slice(0, 80),
      state: code.toUpperCase(),
      zip,
      address: zip || segments.length > 1 ? t : null,
    };
  }

  return {
    city: t.split(",")[0]?.trim().slice(0, 80) || "Unknown",
    state: "XX",
    zip,
    address: null,
  };
}

function looksLikeStreet(s: string): boolean {
  if (/^\d+\s/.test(s)) return true;
  if (STREET_TOKEN.test(s)) return true;
  return false;
}

/** Last 5-digit token that is not a leading street number. */
export function pickPostalZip(locationText: string): string | null {
  const matches = [...locationText.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)];
  if (matches.length === 0) return null;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const m = matches[i]!;
    const zip = m[1]!;
    const after = locationText.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 24);
    // "14050 1st Avenue" — digits followed by ordinal/street → not a ZIP
    if (/^\s+\d{1,3}(st|nd|rd|th)\b/i.test(after)) continue;
    if (/^\s+(ave|avenue|st|street|rd|road|blvd|dr|drive|ln|lane)\b/i.test(after)) continue;
    return zip;
  }
  // If every candidate looked like a street number, still take the last as last resort
  // only when it appears after a state code (… WA 98115).
  const afterState = locationText.match(
    /\b[A-Z]{2}\b[,\s]+(\d{5})(?:-\d{4})?\b/i
  );
  return afterState?.[1] ?? null;
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
  zip?: string | null;
  geoPrecision?: GeoPrecision | null;
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
  const zip =
    (opts.zip && /^\d{5}$/.test(opts.zip) ? opts.zip : null) ||
    (loc.zip && /^\d{5}$/.test(loc.zip) ? loc.zip : null) ||
    NEEDS_REVIEW.zip;
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
      ...(opts.geoPrecision ? { geo_precision: opts.geoPrecision } : {}),
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
