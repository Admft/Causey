import { CompetitionSchema, type Competition } from "../lib/schemas";
import { NEEDS_REVIEW, parseDateRange, slugify, stateToCode } from "./normalize";
import type { RawOnlineRegEvent } from "./parse-onlinereg";
import type { GeoPrecision } from "./geo";

export const ONLINEREG_SCRAPER_ID = "onlinereg_scrape" as const;
export const ONLINEREG_LISTING_URL =
  "https://onlineregistration.cc/tournaments/index.php";

/**
 * OnlineReg names are often machine codes like 2026-0806_EMCC-THUR-NITE-QUADS.
 * Prefer human titles when present; otherwise clean underscores.
 */
export function cleanOnlineRegName(name: string): string {
  const t = name.replace(/\s+/g, " ").trim();
  if (!/^\d{4}-\d{4}/.test(t) && !/^\d{4}-\d{4,}/.test(t)) return t;
  // 2026-0806_EMCC-THUR-NITE-QUADS → EMCC THUR NITE QUADS
  const after = t.replace(/^\d{4}-\d{4,8}_?/, "").replace(/_/g, " ").trim();
  return after.length >= 3 ? after : t;
}

export function onlineRegStandingHint(raw: RawOnlineRegEvent): string {
  const name = raw.name;
  if (/\b(open|championship|national|international)\b/i.test(name)) {
    if ((raw.entryCount ?? 0) >= 80) return "major_field";
    return "solid_open";
  }
  if (/\b(quad|blitz|camp|nite|night|swiss)\b/i.test(name)) return "local";
  if ((raw.entryCount ?? 0) >= 100) return "major_field";
  if ((raw.entryCount ?? 0) >= 40) return "solid_open";
  return "local";
}

export type NormalizeOnlineRegOptions = {
  id: string;
  coords?: { lat: number; lng: number } | null;
  zip?: string | null;
  city?: string | null;
  address?: string | null;
  geoPrecision?: GeoPrecision | null;
};

export function normalizeRawOnlineReg(
  raw: RawOnlineRegEvent,
  opts: NormalizeOnlineRegOptions
): Competition | null {
  const dateBlob = [raw.startText, raw.endText].filter(Boolean).join(" - ");
  const dates = dateBlob ? parseDateRange(dateBlob) : null;
  if (!dates) {
    console.warn(`onlinereg normalize skip (bad date): ${raw.name}`);
    return null;
  }

  const state = raw.stateName ? stateToCode(raw.stateName) : null;
  if (!state) {
    console.warn(`onlinereg normalize skip (bad state): ${raw.name} — ${raw.stateName}`);
    return null;
  }

  const zip =
    opts.zip && /^\d{5}$/.test(opts.zip) ? opts.zip : NEEDS_REVIEW.zip;
  const ready = zip !== NEEDS_REVIEW.zip && Boolean(opts.coords);
  const name = cleanOnlineRegName(raw.name);
  const city = (opts.city?.trim() || "Unknown").slice(0, 80);

  const draft = {
    id: opts.id,
    slug: slugify(name, dates.start) + `-or${raw.tid.replace(/=/g, "")}`,
    name,
    category: "chess",
    organizer_name: raw.organizerHint,
    venue_name: null,
    address: opts.address ?? null,
    city,
    state,
    zip,
    lat: opts.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: opts.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: dates.start,
    end_date: dates.end,
    reg_deadline: null,
    reg_url: raw.regUrl,
    entry_fee_cents: null,
    rated: true,
    rating_system: "uschess",
    series_id: null,
    source: ONLINEREG_SCRAPER_ID,
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
      catalog_standing: onlineRegStandingHint(raw),
      entry_count: raw.entryCount,
      onlinereg_tid: raw.tid,
      raw_name: raw.name,
      ...(opts.geoPrecision ? { geo_precision: opts.geoPrecision } : {}),
    },
    interest_count: 0,
    status: ready ? ("published" as const) : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(draft);
  if (!parsed.success) {
    console.warn(`onlinereg normalize zod fail: ${raw.name}`, parsed.error.issues[0]);
    return null;
  }
  return parsed.data;
}
