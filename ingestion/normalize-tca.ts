import { CompetitionSchema, type Competition } from "../lib/schemas";
import { NEEDS_REVIEW, slugFromSourceUrl } from "./normalize";
import { parseEventTextExtras } from "./parse-sections";
import {
  parseTcaDateRange,
  type RawTcaEvent,
  type TcaDetail,
  TCA_LISTING_URL,
} from "./parse-tca";

export const TCA_SCRAPER_ID = "tca_scrape" as const;
export { TCA_LISTING_URL };

export type NormalizeTcaOptions = {
  id: string;
  detail?: TcaDetail | null;
  coords?: { lat: number; lng: number } | null;
  resolvedZip?: string | null;
  geoPrecision?: import("./geo").GeoPrecision | null;
};

export function normalizeRawTca(
  raw: RawTcaEvent,
  opts: NormalizeTcaOptions
): Competition | null {
  const detail = opts.detail ?? null;
  const listingDates = parseTcaDateRange(raw.excerpt);
  const startDate = detail?.startDate ?? listingDates?.start ?? null;
  if (!startDate) {
    console.warn(`tca normalize skip (no event date): ${raw.name}`);
    return null;
  }

  const zipCandidate = detail?.zip ?? opts.resolvedZip;
  const zip =
    zipCandidate && /^\d{5}$/.test(zipCandidate)
      ? zipCandidate
      : NEEDS_REVIEW.zip;
  const city = detail?.city?.trim() || "Unknown";
  const hasCoords = Boolean(opts.coords);
  const imageUrl = raw.imageUrl ?? detail?.imageUrl ?? null;
  const extras = parseEventTextExtras(
    [raw.excerpt, detail?.bodyText].filter(Boolean).join("\n"),
    raw.name
  );

  const candidate = {
    id: opts.id,
    slug: slugFromSourceUrl(
      raw.detailUrl,
      `tca-${raw.externalKey}-${startDate}`
    ),
    name: raw.name,
    category: "chess",
    organizer_name: "Texas Chess Association",
    venue_name: detail?.venueName ?? null,
    address: detail?.address ?? null,
    city: city.slice(0, 80),
    state: (detail?.state ?? "TX").toUpperCase(),
    zip,
    lat: opts.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: opts.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: startDate,
    end_date: detail?.endDate ?? listingDates?.end ?? null,
    reg_deadline: null,
    reg_url: detail?.registrationUrl ?? raw.detailUrl,
    entry_fee_cents: extras.entry_fee_cents,
    rated: extras.rated,
    rating_system: "uschess",
    series_id: null,
    source: TCA_SCRAPER_ID,
    source_url: raw.detailUrl,
    image_url: imageUrl,
    pathway_status: "none" as const,
    pathway_summary: null,
    pathway_related: [],
    visibility: "public" as const,
    audience: "public" as const,
    org_id: null,
    created_by: null,
    details: {
      tca_post_id: raw.externalKey,
      ...(opts.geoPrecision ? { geo_precision: opts.geoPrecision } : {}),
    },
    interest_count: 0,
    status:
      zip !== NEEDS_REVIEW.zip && hasCoords
        ? ("published" as const)
        : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn(
      `tca normalize zod fail: ${raw.name} — ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    );
    return null;
  }
  return parsed.data;
}
