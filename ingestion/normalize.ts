import { z } from "zod";
import { CompetitionSchema, type Competition } from "../lib/schemas";

/**
 * Maps raw scraped US Chess TLA rows → validated Competition records with
 * status='draft'. Drafts are deliberately incomplete: the TLA index page has
 * no zip, coordinates, or entry fee, so those land as sentinel values and a
 * human enriches them during review (see ingestion/README.md) before
 * flipping status to 'published'. The app never shows drafts.
 */

export const RawTlaSchema = z.object({
  name: z.string().min(3),
  /** As printed on the page, e.g. "Aug 15-16, 2026" or "2026-08-15". */
  dateText: z.string().min(4),
  city: z.string().min(1),
  state: z.string().length(2),
  /** Absolute URL of the TLA detail page. */
  detailUrl: z.string().url(),
});
export type RawTla = z.infer<typeof RawTlaSchema>;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Best-effort TLA date parsing. Returns null (row skipped) when unsure. */
export function parseDateRange(
  text: string
): { start: string; end: string | null } | null {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})(?:\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2}))?/);
  if (iso) return { start: iso[1], end: iso[2] ?? null };

  // "Aug 15-16, 2026" / "Aug 15, 2026" / "Aug 30-Sep 1, 2026"
  const m = text.match(
    /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*[-–]\s*(?:([A-Za-z]{3,9})\.?\s+)?(\d{1,2}))?,?\s+(\d{4})/
  );
  if (!m) return null;
  const [, mon1, d1, mon2, d2, year] = m;
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

export function normalizeRawTla(raw: RawTla, id: string): Competition | null {
  const dates = parseDateRange(raw.dateText);
  if (!dates) return null;

  const candidate = {
    id,
    slug: slugify(raw.name, dates.start),
    name: raw.name,
    category: "chess",
    organizer_name: null,
    venue_name: null,
    address: null,
    city: raw.city,
    state: raw.state.toUpperCase(),
    zip: NEEDS_REVIEW.zip,
    lat: NEEDS_REVIEW.lat,
    lng: NEEDS_REVIEW.lng,
    start_date: dates.start,
    end_date: dates.end,
    reg_deadline: null,
    reg_url: raw.detailUrl,
    entry_fee_cents: 0, // TLA index doesn't list fees — reviewer fills in
    rated: true,
    rating_system: "uschess",
    series_id: null,
    source: "tla_scrape" as const,
    status: "draft" as const,
  };

  const parsed = CompetitionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
