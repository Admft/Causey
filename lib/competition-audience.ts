import {
  COMPETITION_AUDIENCE_OPTIONS,
  type CompetitionAudience,
  type Organization,
} from "@/lib/auth/orgs";

/**
 * District-only audience is meaningful only when the host sits in a
 * district hierarchy: the district itself, or a school with parent_org_id.
 * Clubs, teams, and standalone schools must not offer or publish it.
 */
export function organizationSupportsDistrictAudience(
  org: Pick<Organization, "type" | "parent_org_id"> | null | undefined
): boolean {
  if (!org) return false;
  return org.type === "district" || Boolean(org.parent_org_id);
}

export function competitionAudienceOptions(districtAvailable: boolean) {
  if (districtAvailable) return COMPETITION_AUDIENCE_OPTIONS;
  return COMPETITION_AUDIENCE_OPTIONS.filter(
    (option) => option.value !== "district"
  );
}

/** Clamp a stored/draft audience when the host cannot use district-only. */
export function resolveCompetitionAudience(
  audience: CompetitionAudience | null | undefined,
  districtAvailable: boolean,
  visibility: "public" | "private" = "private"
): CompetitionAudience {
  if (audience === "district" && !districtAvailable) {
    return visibility === "public" ? "public" : "school";
  }
  if (audience) return audience;
  return visibility === "public" ? "public" : "school";
}

export const DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE =
  "District-only audience needs a district host or a school connected to a district. Choose school only, invite only, or public.";
