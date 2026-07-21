import { z } from "zod";
import { CompetitionSchema, type Competition } from "../lib/schemas";
import { stateToCode, slugify, NEEDS_REVIEW } from "./normalize";

export const CCA_SCRAPER_ID = "cca_scrape" as const;
export const CCA_LISTING_URL = "https://www.chesstour.com/refs.html";
export const CCA_REG_URL = "https://www.chessaction.com/";

export const RawCcaSchema = z.object({
  name: z.string().min(3),
  dateText: z.string().min(4),
  city: z.string().min(1),
  state: z.string().length(2),
  detailUrl: z.string().url(),
  isBlitz: z.boolean().default(false),
});
export type RawCca = z.infer<typeof RawCcaSchema>;

export type CcaDetailEnrichment = {
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  titleName: string | null;
  dateText: string | null;
  endDate: string | null;
  imageUrl: string | null;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n: number | string) => String(n).padStart(2, "0");

/**
 * CCA date lines look like:
 *   "July 17-19 or 18-19, 2026"
 *   "August 13-16, 14-16 or 15-16, 2026"
 *   "Sept 3-6, 2026"
 *   "Oct 9-11: Midwest Class..."
 */
export function parseCcaDateRange(
  text: string,
  fallbackYear?: number
): { start: string; end: string | null } | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const yearMatch = cleaned.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : fallbackYear;
  if (!year) return null;

  const m = cleaned.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?(?:\s*(?:or|,)\s*)?/i
  );
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  if (!mon) return null;
  const d1 = Number(m[2]);
  const d2 = m[3] ? Number(m[3]) : null;
  const start = `${year}-${pad(mon)}-${pad(d1)}`;
  if (!d2 || d2 === d1) return { start, end: null };
  return { start, end: `${year}-${pad(mon)}-${pad(d2)}` };
}

export function slugFromCcaUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const leaf = u.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    const base = leaf.replace(/\.html?$/i, "");
    const hash = u.hash.replace(/^#/, "").toLowerCase();
    const combined = hash ? `${base}-${hash}` : base;
    const cleaned = combined.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (cleaned.length >= 2) return `cca-${cleaned}`.slice(0, 80);
  } catch {
    /* fall through */
  }
  return `cca-${fallback}`.slice(0, 80);
}

export function normalizeRawCca(
  raw: RawCca,
  opts: {
    id: string;
    detail?: CcaDetailEnrichment | null;
    coords?: { lat: number; lng: number } | null;
  }
): Competition | null {
  const dateText = opts.detail?.dateText || raw.dateText;
  const dates = parseCcaDateRange(dateText);
  if (!dates) return null;

  const detail = opts.detail ?? null;
  const zip =
    detail?.zip && /^\d{5}$/.test(detail.zip) ? detail.zip : NEEDS_REVIEW.zip;
  const hasCoords = Boolean(opts.coords);
  const city = detail?.city?.trim() || raw.city;
  const state =
    (detail?.state && stateToCode(detail.state)) || raw.state;
  const name = detail?.titleName?.trim() || raw.name;
  const ready = zip !== NEEDS_REVIEW.zip && hasCoords;

  const candidate = {
    id: opts.id,
    slug: slugFromCcaUrl(raw.detailUrl, slugify(name, dates.start)),
    name: raw.isBlitz && !/blitz/i.test(name) ? `${name} Blitz` : name,
    category: "chess",
    organizer_name: "Continental Chess Association",
    venue_name: detail?.venueName ?? null,
    address: detail?.address ?? null,
    city,
    state: state.toUpperCase(),
    zip,
    lat: opts.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: opts.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: dates.start,
    end_date: detail?.endDate ?? dates.end,
    reg_deadline: null,
    reg_url: CCA_REG_URL,
    entry_fee_cents: 0,
    rated: true,
    rating_system: "uschess",
    series_id: null,
    source: CCA_SCRAPER_ID,
    source_url: raw.detailUrl,
    image_url: detail?.imageUrl ?? null,
    status: ready ? ("published" as const) : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
