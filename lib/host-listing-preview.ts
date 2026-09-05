import { storedFacetsForOrganizer } from "@/lib/category-discovery";
import type { CompetitionResult } from "@/lib/data/types";
import {
  CompetitionFacetSchema,
  type CompetitionAudience,
  type CompetitionCategory,
  type ParticipationMode,
  type TournamentSectionDraft,
} from "@/lib/schemas";

export const HOST_LISTING_PREVIEW_ID =
  "00000000-0000-4000-a000-000000000001";

function previewSectionId(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

function twoLetterState(value: string): string | null {
  const state = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : null;
}

function fiveDigitZip(value: string): string | null {
  const zip = value.trim();
  return /^\d{5}$/.test(zip) ? zip : null;
}

export function buildHostListingPreview(input: {
  orgId: string;
  orgName: string;
  category: CompetitionCategory;
  customCategoryName: string;
  participationMode: ParticipationMode;
  name: string;
  startDate: string;
  endDate: string;
  regDeadline: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  entryFeeCents: number | null;
  rated: boolean;
  imageUrl: string | null;
  primaryFacet: string;
  mathTypeFacet: string;
  sections: TournamentSectionDraft[];
  audience: CompetitionAudience;
}): CompetitionResult {
  const sections = (input.sections.length ? input.sections : [
    {
      name: "Open",
      minRating: null,
      maxRating: null,
      minGrade: null,
      maxGrade: null,
      entryFeeCents: null,
    },
  ]).map((section, index) => ({
    id: previewSectionId(index),
    competition_id: HOST_LISTING_PREVIEW_ID,
    name: section.name.trim() || `Division ${index + 1}`,
    min_rating: section.minRating,
    max_rating: section.maxRating,
    min_grade: section.minGrade,
    max_grade: section.maxGrade,
    min_age: null,
    max_age: null,
    gender_restriction: null,
    residency_state: null,
    entry_fee_cents: section.entryFeeCents,
  }));
  const online = input.participationMode === "online";

  return {
    id: HOST_LISTING_PREVIEW_ID,
    slug: "preview",
    name: input.name.trim() || "Untitled competition",
    category: input.category,
    custom_category_name:
      input.category === "other" ? input.customCategoryName.trim() || null : null,
    participation_mode: input.participationMode,
    organizer_name: input.orgName.trim() || null,
    venue_name: online ? null : input.venueName.trim() || null,
    address: online ? null : input.address.trim() || null,
    city: online ? null : input.city.trim() || null,
    state: online ? null : twoLetterState(input.state),
    zip: online ? null : fiveDigitZip(input.zip),
    lat: null,
    lng: null,
    start_date: input.startDate,
    end_date: input.endDate || null,
    reg_deadline: input.regDeadline || null,
    reg_url: null,
    entry_fee_cents: input.entryFeeCents,
    rated: input.category === "chess" ? input.rated : false,
    rating_system: input.category === "chess" && input.rated ? "uschess" : null,
    series_id: null,
    source: "organizer",
    source_url: null,
    image_url: input.imageUrl,
    pathway_status: "none",
    pathway_summary: null,
    pathway_related: [],
    visibility: input.audience === "public" ? "public" : "private",
    audience: input.audience,
    org_id: input.orgId,
    created_by: null,
    details: {
      facets: storedFacetsForOrganizer(
        input.category,
        input.primaryFacet,
        input.mathTypeFacet
      ).flatMap((facet) => {
        const parsed = CompetitionFacetSchema.safeParse(facet);
        return parsed.success ? [parsed.data] : [];
      }),
    },
    interest_count: 0,
    status: "published",
    sections,
    series: null,
    viewer_org_match: false,
    distance_miles: null,
    matching_section_ids: sections.map((section) => section.id),
  };
}

/** Honest caption for the search-card preview — not a live directory promise. */
export function hostListingSearchNote(input: {
  audience: CompetitionAudience;
  category: CompetitionCategory;
  orgType?: "school" | "club" | "team" | "district";
  admin?: boolean;
}): string {
  if (input.audience === "public") {
    if (input.category === "other") {
      return "Approved public listings are shared by a direct link. Custom types are not added to a directory.";
    }
    return input.admin
      ? "Publishing puts this card in the directory immediately."
      : "After platform review, this is the card families see in search.";
  }
  if (input.audience === "invite_only") {
    return "Invitees see this listing. It is not added to public search.";
  }
  if (input.audience === "district") {
    return "District staff and connected schools see this listing. It is not added to public search.";
  }
  if (input.orgType === "club") {
    return "Club members see this listing. It is not added to public search.";
  }
  if (input.orgType === "team") {
    return "Team members see this listing. It is not added to public search.";
  }
  return "People in this school see this listing. It is not added to public search.";
}
