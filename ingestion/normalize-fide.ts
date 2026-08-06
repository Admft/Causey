import { z } from "zod";
import { CompetitionSchema, type Competition } from "../lib/schemas";
import { NEEDS_REVIEW, slugify, stateToCode } from "./normalize";
import type { FideCatalogClass, RawFideEvent } from "./parse-fide";

export const FIDE_SCRAPER_ID = "fide_calendar_scrape" as const;
export const FIDE_LISTING_URL = "https://calendar.fide.com/calendar.php";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse FIDE tile dates like "29 Jul-28 Aug", "8-21 Aug", "29Jul-28Aug". */
export function parseFideDateRange(
  text: string,
  now = new Date()
): { start: string; end: string | null } | null {
  const year = now.getUTCFullYear();
  const t = text.replace(/\s+/g, " ").trim();

  // 29 Jul-28 Aug  or  29 Jul - 28 Aug
  let m = t.match(
    /(\d{1,2})\s*([A-Za-z]{3})\s*[–-]\s*(\d{1,2})\s*([A-Za-z]{3})/i
  );
  if (m) {
    const mon1 = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const mon2 = MONTHS[m[4].slice(0, 3).toLowerCase()];
    if (!mon1 || !mon2) return null;
    let y1 = year;
    let y2 = year;
    // Cross-year rare; if end month < start month, end is next year
    if (mon2 < mon1) y2 = year + 1;
    // If start month already passed and end is later same year — ok.
    // If both months are behind "now", roll both forward.
    const cur = now.getUTCMonth() + 1;
    if (mon2 < cur && mon1 < cur) {
      y1 += 1;
      y2 += 1;
    }
    return {
      start: `${y1}-${pad(mon1)}-${pad(Number(m[1]))}`,
      end: `${y2}-${pad(mon2)}-${pad(Number(m[3]))}`,
    };
  }

  // 8-21 Aug
  m = t.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})\s*([A-Za-z]{3})/i);
  if (m) {
    const mon = MONTHS[m[3].slice(0, 3).toLowerCase()];
    if (!mon) return null;
    let y = year;
    if (mon < now.getUTCMonth() + 1) y += 1;
    return {
      start: `${y}-${pad(mon)}-${pad(Number(m[1]))}`,
      end: `${y}-${pad(mon)}-${pad(Number(m[2]))}`,
    };
  }

  // 29Jul-28Aug glued
  m = t.match(/(\d{1,2})([A-Za-z]{3})\s*[–-]\s*(\d{1,2})([A-Za-z]{3})/i);
  if (m) {
    return parseFideDateRange(`${m[1]} ${m[2]}-${m[3]} ${m[4]}`, now);
  }

  return null;
}

/** Best-effort US state from "Saint Louis, Missouri, USA" / "Glendale , USA". */
export function parseFideLocation(locationText: string): {
  city: string;
  state: string;
  country: string | null;
} {
  const parts = locationText
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { city: "Unknown", state: "XX", country: null };

  const last = parts[parts.length - 1];
  const country = /^(USA|United States)$/i.test(last)
    ? "USA"
    : /^[A-Z]{3}$/.test(last)
      ? last
      : last.length <= 3
        ? last.toUpperCase()
        : last;

  if (country === "USA" || /united states/i.test(last)) {
    if (parts.length >= 3) {
      const code = stateToCode(parts[parts.length - 2]);
      return {
        city: parts.slice(0, -2).join(", ") || parts[0],
        state: code ?? "XX",
        country: "USA",
      };
    }
    // "Glendale, USA" — city only
    return { city: parts[0], state: "XX", country: "USA" };
  }

  // "Saint Louis, Missouri" (no country suffix)
  if (parts.length >= 2) {
    const maybeState = stateToCode(parts[parts.length - 1]!);
    if (maybeState) {
      return {
        city: parts.slice(0, -1).join(", "),
        state: maybeState,
        country: "USA",
      };
    }
  }

  // International — use XX so fingerprint still works; stays draft without coords.
  return {
    city: parts.slice(0, -1).join(", ") || parts[0],
    state: "XX",
    country: typeof country === "string" ? country : null,
  };
}

export function fideStandingHint(catalog: FideCatalogClass): string {
  switch (catalog) {
    case "world_fide":
      return "world_fide";
    case "world_top":
      return "world_top";
    case "circuit":
      return "circuit";
    case "youth":
      return "youth";
    default:
      return "other";
  }
}

export type NormalizeFideOptions = {
  id: string;
  coords?: { lat: number; lng: number } | null;
  zip?: string | null;
  geoPrecision?: import("./geo").GeoPrecision | null;
};

export function normalizeRawFide(
  raw: RawFideEvent,
  opts: NormalizeFideOptions
): Competition | null {
  const dates = parseFideDateRange(raw.dateText);
  if (!dates) {
    console.warn(`fide normalize skip (bad date): ${raw.name} — ${raw.dateText}`);
    return null;
  }
  const loc = parseFideLocation(raw.locationText || raw.city);
  const zip =
    opts.zip && /^\d{5}$/.test(opts.zip) ? opts.zip : NEEDS_REVIEW.zip;
  const ready = zip !== NEEDS_REVIEW.zip && Boolean(opts.coords) && loc.state !== "XX";

  const draft = {
    id: opts.id,
    slug: slugify(raw.name, dates.start) + `-fide${raw.externalKey}`,
    name: raw.name,
    category: "chess",
    organizer_name: "FIDE",
    venue_name: null,
    address: null,
    city: loc.city.slice(0, 80) || "Unknown",
    state: loc.state,
    zip,
    lat: opts.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: opts.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: dates.start,
    end_date: dates.end,
    reg_deadline: null,
    reg_url: raw.detailUrl,
    entry_fee_cents: null,
    rated: true,
    rating_system: "fide",
    series_id: null,
    source: FIDE_SCRAPER_ID,
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
      catalog_class: raw.catalogClass,
      catalog_standing: fideStandingHint(raw.catalogClass),
      time_control: raw.timeControl,
      country: loc.country,
      fide_calendar_id: raw.externalKey,
      location_raw: raw.locationText,
      ...(opts.geoPrecision ? { geo_precision: opts.geoPrecision } : {}),
    },
    interest_count: 0,
    status: ready ? ("published" as const) : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(draft);
  if (!parsed.success) {
    console.warn(`fide normalize zod fail: ${raw.name}`, parsed.error.issues[0]);
    return null;
  }
  return parsed.data;
}

export const RawFideEventSchema = z.custom<RawFideEvent>();
