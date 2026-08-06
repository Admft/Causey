import type { AccountRole } from "@/lib/auth/types";

/**
 * Default post-auth landing by account role.
 * Parents → family desk; students → tournament plan; coaches → orgs.
 */
export function homePathForRole(role: AccountRole | string | null | undefined): string {
  if (role === "parent") return "/family";
  if (role === "coach") return "/orgs";
  if (role === "student") return "/me";
  return "/me";
}
