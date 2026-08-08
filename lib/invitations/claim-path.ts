import type { OrgMemberRole } from "@/lib/auth/orgs";
import type { AccountRole } from "@/lib/auth/types";

const STAFF_ORG_ROLES = new Set<string>([
  "assistant_coach",
  "coach",
  "admin",
  "school_admin",
  "district_admin",
]);

/** Staff/admin invitations should create an adult coach/organizer account. */
export function isStaffOrgInvitationRole(role: string): boolean {
  return STAFF_ORG_ROLES.has(role);
}

/** Map organization membership role → Causey account role for claim signup. */
export function accountRoleForOrgInvitationRole(
  role: OrgMemberRole | string
): AccountRole {
  return isStaffOrgInvitationRole(role) ? "coach" : "student";
}

/** Claim deep-link. Persona comes from the invitation preview RPC, not the URL. */
export function buildClaimPath(token: string): string {
  return `/claim/${token}`;
}

export function extractClaimToken(
  next: string | null | undefined
): string | undefined {
  if (!next?.startsWith("/claim/")) return undefined;
  const pathOnly = next.split("?")[0] ?? next;
  const match = pathOnly.match(/^\/claim\/([a-f0-9]{64})$/i);
  return match?.[1];
}

export function isJoinCodeNextPath(next: string | null | undefined): boolean {
  return Boolean(next?.startsWith("/join/"));
}

export function isClaimNextPath(next: string | null | undefined): boolean {
  return Boolean(extractClaimToken(next));
}

export function invitationRoleFitsOrganization(
  orgType: string,
  role: OrgMemberRole | string
): boolean {
  if (orgType === "district") {
    return role !== "student" && role !== "school_admin";
  }
  return role !== "district_admin";
}
