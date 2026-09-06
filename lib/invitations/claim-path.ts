import type { OrgMemberRole } from "@/lib/auth/orgs";
import type { AccountRole } from "@/lib/auth/types";
import {
  isValidActivationCode,
  normalizeActivationCode,
} from "@/lib/invitations/activation-code";

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
): Extract<AccountRole, "student" | "coach"> {
  return isStaffOrgInvitationRole(role) ? "coach" : "student";
}

/** Claim deep-link. Persona comes from the invitation preview RPC, not the URL. */
export function buildClaimPath(token: string): string {
  return `/claim/${token}`;
}

/** Claim entry for staff who were read a code instead of emailed a link. */
export function buildClaimCodePath(code: string): string {
  return `/claim?code=${encodeURIComponent(normalizeActivationCode(code))}`;
}

export function extractClaimToken(
  next: string | null | undefined
): string | undefined {
  if (!next?.startsWith("/claim/")) return undefined;
  const pathOnly = next.split("?")[0] ?? next;
  const match = pathOnly.match(/^\/claim\/([a-f0-9]{64})$/i);
  return match?.[1];
}

export function extractClaimCode(
  next: string | null | undefined
): string | undefined {
  if (!next?.startsWith("/claim?")) return undefined;
  const raw = new URLSearchParams(next.slice(next.indexOf("?") + 1)).get(
    "code"
  );
  if (!raw) return undefined;
  const code = normalizeActivationCode(raw);
  return isValidActivationCode(code) ? code : undefined;
}

export function isJoinCodeNextPath(next: string | null | undefined): boolean {
  return Boolean(next?.startsWith("/join/"));
}

export function isClaimNextPath(next: string | null | undefined): boolean {
  return Boolean(extractClaimToken(next) ?? extractClaimCode(next));
}

/**
 * Preview RPCs only return a masked hint (`j***@school.edu`). Used to hide
 * Accept when the signed-in mailbox is clearly not the invited one.
 */
export function invitationEmailHintMatches(
  email: string,
  hint: string
): boolean {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  const hintAt = hint.trim().toLowerCase().lastIndexOf("@");
  if (at < 1 || hintAt < 1) return false;
  const local = email.trim().toLowerCase().slice(0, at);
  const domain = email.trim().toLowerCase().slice(at + 1);
  const hintLocal = hint.trim().toLowerCase().slice(0, hintAt);
  const hintDomain = hint.trim().toLowerCase().slice(hintAt + 1);
  const prefix = hintLocal.replace(/\*+$/, "");
  return prefix.length > 0 && local.startsWith(prefix) && domain === hintDomain;
}

export function claimSignupHref(next: string, memberRole: string): string {
  const role = accountRoleForOrgInvitationRole(memberRole);
  return `/signup?role=${role}&next=${encodeURIComponent(next)}`;
}

export function invitationRoleFitsOrganization(
  orgType: string,
  role: OrgMemberRole | string
): boolean {
  if (orgType === "district") {
    return role !== "student" && role !== "school_admin";
  }
  if (orgType === "club" || orgType === "team") {
    return role !== "district_admin" && role !== "school_admin";
  }
  return role !== "district_admin";
}
