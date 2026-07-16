import { z } from "zod";
import { CompetitionSchema, type Competition } from "../lib/schemas";

/**
 * Maps raw scraped US Chess upcoming-tournament rows → validated Competition
 * records. Provenance:
 *   source      = 'tla_scrape'  (which scraper / pipeline)
 *   source_url  = the US Chess event page that was scraped
 *   reg_url     = best outbound link (organizer site when known, else source_url)
 *
 * Listing-only rows may still need zip/coords; detail enrichment fills those
 * when the address includes a postal code we can resolve via the zips table.
 */

export const SCRAPER_ID = "tla_scrape" as const;
export const SCRAPER_SITE = "https://new.uschess.org/upcoming-tournaments";

export const RawTlaSchema = z.object({
  name: z.string().min(3),
  /** ISO datetime from <time datetime="..."> when present, else printed text. */
  dateText: z.string().min(4),
  city: z.string().min(1),
  /** 2-letter state code after normalization. */
  state: z.string().length(2),
  /** Absolute URL of the US Chess event detail page. */
  detailUrl: z.string().url(),
  organizerName: z.string().nullable().optional(),
  blurb: z.string().nullable().optional(),
});
export type RawTla = z.infer<typeof RawTlaSchema>;

export type DetailEnrichment = {
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  organizerWebsite: string | null;
  online: boolean;
  endDate: string | null;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** US state / territory full name → code (listing page prints full names). */
export const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", "american samoa": "AS", arizona: "AZ",
  arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA",
  guam: "GU", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN",
  iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME",
  "marshall islands": "MH", maryland: "MD", massachusetts: "MA", michigan: "MI",
  micronesia: "FM", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND",
  "northern mariana islands": "MP", ohio: "OH", oklahoma: "OK", oregon: "OR",
  palau: "PW", pennsylvania: "PA", "puerto rico": "PR", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", "virgin islands": "VI", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "armed forces (aa)": "AA", "armed forces (ae)": "AE", "armed forces (ap)": "AP",
};

export function stateToCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null;
}

/** Best-effort date parsing. Returns null (row skipped) when unsure. */
export function parseDateRange(
  text: string
): { start: string; end: string | null } | null {
  const isoDt = text.match(/(\d{4}-\d{2}-\d{2})T/);
  if (isoDt) return { start: isoDt[1], end: null };

  const iso = text.match(
    /(\d{4}-\d{2}-\d{2})(?:\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2}))?/
  );
  if (iso) return { start: iso[1], end: iso[2] ?? null };

  // "Tuesday, July 21, 2026" / "July 21, 2026" / "Aug 15-16, 2026"
  const long = text.match(
    /(?:[A-Za-z]+,\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[-–]\s*(?:([A-Za-z]{3,9})\.?\s+)?(\d{1,2}))?,?\s+(\d{4})/
  );
  if (!long) return null;
  const [, mon1, d1, mon2, d2, year] = long;
  const month1 = MONTHS[mon1.slice(0, 3).toLowerCase()];
  if (!month1) return null;
  const pad = (n: number | string) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month1)}-${pad(d1)}`;
  if (!d2) return { start, end: null };
  const month2 = mon2 ? MONTHS[mon2.slice(0, 3).toLowerCase()] : month1;
  if (!month2) return { start, end: null };
  return { start, end: `${year}-${pad(month2)}-${pad(d2)}` };
}

export function slugify(name: string, startDate: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) + `-${startDate}`
  );
}

/** Sentinels a reviewer must replace before publishing a draft. */
export const NEEDS_REVIEW = {
  zip: "00000",
  lat: 0,
  lng: 0,
} as const;

export type NormalizeOptions = {
  id: string;
  detail?: DetailEnrichment | null;
  /** Resolved lat/lng from the zips table when zip is known. */
  coords?: { lat: number; lng: number } | null;
};

export function normalizeRawTla(
  raw: RawTla,
  opts: NormalizeOptions
): Competition | null {
  const dates = parseDateRange(raw.dateText);
  if (!dates) return null;

  const detail = opts.detail ?? null;
  if (detail?.online) return null; // OTB discovery product — skip online events

  const zip = detail?.zip && /^\d{5}$/.test(detail.zip) ? detail.zip : NEEDS_REVIEW.zip;
  const hasCoords = Boolean(opts.coords);
  const city = detail?.city?.trim() || raw.city;
  const state = (detail?.state && stateToCode(detail.state)) || raw.state;
  const regUrl = detail?.organizerWebsite || raw.detailUrl;
  const ready = zip !== NEEDS_REVIEW.zip && hasCoords;

  const candidate = {
    id: opts.id,
    slug: slugify(raw.name, dates.start),
    name: raw.name,
    category: "chess",
    organizer_name: raw.organizerName ?? null,
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
    reg_url: regUrl,
    entry_fee_cents: 0, // fees live in free text; fill later / by hand
    rated: true,
    rating_system: "uschess",
    series_id: null,
    source: SCRAPER_ID,
    source_url: raw.detailUrl,
    // Publish when we have a real location so search works; otherwise draft.
    status: ready ? ("published" as const) : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
