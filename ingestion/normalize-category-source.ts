import {
  COMPETITION_DETAILS_SCHEMA_VERSION,
  CompetitionSchema,
  type Competition,
} from "../lib/schemas";
import { NEEDS_REVIEW, slugify } from "./normalize";
import type { RawCategoryEvent } from "./category-source-types";

export const CATEGORY_SOURCE_CONFIG = {
  tabroom_scrape: {
    category: "debate",
    organizer: "Tabroom listing",
  },
  vex_events_scrape: {
    category: "stem",
    organizer: "VEX Robotics",
  },
  taea_vase_scrape: {
    category: "arts",
    organizer: "Texas Art Education Association",
  },
  bennington_writers_scrape: {
    category: "writing",
    organizer: "Bennington College",
  },
  doe_science_bowl_scrape: {
    category: "stem",
    organizer: "U.S. Department of Energy Office of Science",
  },
  afsa_essay_scrape: {
    category: "writing",
    organizer: "American Foreign Service Association",
  },
  uil_theatre_scrape: {
    category: "arts",
    organizer: "University Interscholastic League",
  },
  uil_speech_debate_scrape: {
    category: "debate",
    organizer: "University Interscholastic League",
  },
  purple_comet_scrape: {
    category: "stem",
    organizer: "Purple Comet! Math Meet",
  },
  uil_music_marching_scrape: {
    category: "arts",
    organizer: "University Interscholastic League",
  },
  txsef_scrape: {
    category: "stem",
    organizer: "Texas A&M Engineering",
  },
  congressional_app_challenge_scrape: {
    category: "stem",
    organizer: "Congressional App Challenge",
  },
  hack_club_hackathons_scrape: {
    category: "stem",
    organizer: "Hack Club Hackathons listing",
  },
} as const;

export type CategoryScrapeSource = keyof typeof CATEGORY_SOURCE_CONFIG;

export function normalizeCategorySourceEvent(
  raw: RawCategoryEvent,
  options: {
    id: string;
    source: CategoryScrapeSource;
    coords?: { lat: number; lng: number } | null;
    resolvedZip?: string | null;
    geoPrecision?: string | null;
  }
): Competition | null {
  const config = CATEGORY_SOURCE_CONFIG[options.source];
  const online = raw.participationMode === "online";
  const zip =
    raw.zip && /^\d{5}$/.test(raw.zip)
      ? raw.zip
      : options.resolvedZip && /^\d{5}$/.test(options.resolvedZip)
        ? options.resolvedZip
        : null;
  const locationReady =
    online ||
    Boolean(
      raw.city &&
        raw.state &&
        /^[A-Z]{2}$/.test(raw.state) &&
        zip &&
        options.coords
    );
  const sourceSuffix = raw.externalKey.replace(/[^a-z0-9]+/gi, "").slice(-18);

  const draft = {
    id: options.id,
    slug: `${slugify(raw.name, raw.startDate)}-${sourceSuffix.toLowerCase()}`,
    name: raw.name,
    category: config.category,
    custom_category_name: null,
    participation_mode: raw.participationMode,
    organizer_name: config.organizer,
    venue_name: raw.venueName,
    address: raw.address,
    city: online ? null : raw.city ?? "Unknown",
    state: online ? null : raw.state ?? "XX",
    zip: online ? null : zip ?? NEEDS_REVIEW.zip,
    lat: online ? null : options.coords?.lat ?? NEEDS_REVIEW.lat,
    lng: online ? null : options.coords?.lng ?? NEEDS_REVIEW.lng,
    start_date: raw.startDate,
    end_date: raw.endDate,
    reg_deadline: raw.regDeadline,
    reg_url:
      raw.registrationUrl === undefined ? raw.detailUrl : raw.registrationUrl,
    entry_fee_cents: raw.entryFeeCents,
    rated: false,
    rating_system: null,
    series_id: null,
    source: options.source,
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
      schema_version: COMPETITION_DETAILS_SCHEMA_VERSION,
      facets: raw.facets,
      event_type: raw.eventType,
      ...(raw.classifications
        ? { classifications: raw.classifications }
        : {}),
      source_availability: raw.availability,
      source_external_key: raw.externalKey,
      source_fetched_at: new Date().toISOString(),
      ...(raw.locationSourceUrl
        ? { location_source_url: raw.locationSourceUrl }
        : {}),
      ...(raw.deadlineSourceUrl
        ? { deadline_source_url: raw.deadlineSourceUrl }
        : {}),
      ...(raw.dateSemantics ? { date_semantics: raw.dateSemantics } : {}),
      ...(options.geoPrecision ? { geo_precision: options.geoPrecision } : {}),
    },
    interest_count: 0,
    status:
      raw.availability === "canceled"
        ? ("archived" as const)
        : locationReady
          ? ("published" as const)
          : ("draft" as const),
  };

  const parsed = CompetitionSchema.safeParse(draft);
  if (!parsed.success) {
    console.warn(
      `${options.source} normalize skipped: ${raw.name}`,
      parsed.error.issues[0]
    );
    return null;
  }
  return parsed.data;
}
