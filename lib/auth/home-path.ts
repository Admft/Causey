import type { AccountRole } from "@/lib/auth/types";

/**
 * Default post-auth landing by account role.
 * Matches AuthNav portals: parents → family, coaches/students → orgs.
 */
export function homePathForRole(role: AccountRole | string | null | undefined): string {
  if (role === "parent") return "/family";
  if (role === "coach" || role === "student") return "/orgs";
  return "/me";
}
