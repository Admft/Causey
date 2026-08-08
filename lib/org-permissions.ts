import type { Profile } from "@/lib/auth/types";
import type { Organization, OrgMembership } from "@/lib/auth/orgs";

/**
 * Pure UI-gating predicates mirroring the SQL helpers in
 * supabase/migrations/0011_org_access.sql. RLS is the enforcement layer;
 * these only decide what to render and what to attempt.
 */

export function isActiveMember(
  membership: Pick<OrgMembership, "status"> | null | undefined
): boolean {
  return membership?.status === "active";
}

export function isOrgStaff(
  org: Pick<Organization, "owner_profile_id">,
  membership: Pick<OrgMembership, "role" | "status"> | null | undefined,
  profileId: string
): boolean {
  if (org.owner_profile_id === profileId) return true;
  return (
    membership?.status === "active" &&
    [
      "assistant_coach",
      "coach",
      "admin",
      "school_admin",
      "district_admin",
    ].includes(membership.role)
  );
}

/**
 * Operator authority is intentionally narrower than staff access.
 * Assistant coaches may enter the roster workspace and read scoped data, but
 * cannot mutate rosters, publish announcements, or operate tournaments.
 */
export function isOrgCoach(
  org: Pick<Organization, "owner_profile_id">,
  membership: Pick<OrgMembership, "role" | "status"> | null | undefined,
  profileId: string
): boolean {
  if (org.owner_profile_id === profileId) return true;
  return (
    membership?.status === "active" &&
    ["coach", "admin", "school_admin", "district_admin"].includes(
      membership.role
    )
  );
}

export function isOrgAdmin(
  org: Pick<Organization, "owner_profile_id">,
  membership: Pick<OrgMembership, "role" | "status"> | null | undefined,
  profileId: string
): boolean {
  if (org.owner_profile_id === profileId) {
    return true;
  }
  return (
    membership?.status === "active" &&
    (membership.role === "admin" ||
      membership.role === "school_admin" ||
      membership.role === "district_admin")
  );
}

export function isDistrictAdmin(
  org: Pick<Organization, "type" | "owner_profile_id">,
  membership: Pick<OrgMembership, "role" | "status"> | null | undefined,
  profileId: string
): boolean {
  return (
    org.type === "district" &&
    (org.owner_profile_id === profileId ||
      (membership?.status === "active" &&
        membership.role === "district_admin"))
  );
}

export function canCreateOrg(
  profile: Pick<Profile, "role" | "role_unlocked"> | null | undefined
): boolean {
  return profile?.role === "coach" && profile.role_unlocked;
}

export function canCreateTournament(
  profile: Pick<Profile, "id" | "role" | "role_unlocked"> | null | undefined,
  org: Pick<Organization, "owner_profile_id">,
  membership: Pick<OrgMembership, "role" | "status"> | null | undefined
): boolean {
  if (!profile) return false;
  return isOrgCoach(org, membership, profile.id);
}

/** A viewer may RSVP for themselves or for an actively linked child. */
export function canRsvpFor(
  viewerId: string,
  entrantProfileId: string,
  activeChildIds: readonly string[]
): boolean {
  return (
    viewerId === entrantProfileId || activeChildIds.includes(entrantProfileId)
  );
}
