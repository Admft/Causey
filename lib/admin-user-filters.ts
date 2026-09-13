import { z } from "zod";
import type {
  OrganizationType,
  OrgMemberRole,
  OrgMemberStatus,
} from "@/lib/auth/orgs";
type AdminUserAccessFilter = "all" | "admins";

const uuidSchema = z.string().uuid();
const organizationTypeSchema = z.enum(["school", "district", "club", "team"]);
const accountRoleSchema = z.enum(["student", "parent", "coach"]);
const membershipRoleSchema = z.enum([
  "student",
  "assistant_coach",
  "coach",
  "school_admin",
  "district_admin",
  "admin",
]);
const membershipStatusSchema = z.enum(["active", "invited", "removed"]);

export type AdminUserCursor = {
  name: string;
  email: string;
  id: string;
};

export type AdminUserFilters = {
  access: AdminUserAccessFilter;
  q?: string;
  districtId?: string;
  orgId?: string;
  orgType?: OrganizationType;
  accountRole?: "student" | "parent" | "coach";
  membershipRole?: OrgMemberRole;
  membershipStatus?: OrgMemberStatus;
  cursor?: AdminUserCursor;
  direction: "next" | "previous";
};

function optionalParsed<T>(
  schema: z.ZodType<T>,
  value?: string
): T | undefined {
  if (!value) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function encodeAdminUserCursor(cursor: AdminUserCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeAdminUserCursor(raw?: string): AdminUserCursor | undefined {
  if (!raw || raw.length > 1000) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const result = z
      .object({
        name: z.string().max(200),
        email: z.string().max(320),
        id: uuidSchema,
      })
      .safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function parseAdminUserFilters(input: {
  access?: string;
  q?: string;
  district?: string;
  org?: string;
  orgType?: string;
  accountRole?: string;
  membershipRole?: string;
  membershipStatus?: string;
  cursor?: string;
  direction?: string;
}): AdminUserFilters {
  const q = input.q?.trim().slice(0, 200) || undefined;
  const cursor = decodeAdminUserCursor(input.cursor);
  return {
    access: input.access === "admins" ? "admins" : "all",
    ...(q ? { q } : {}),
    ...(optionalParsed(uuidSchema, input.district)
      ? { districtId: input.district }
      : {}),
    ...(optionalParsed(uuidSchema, input.org) ? { orgId: input.org } : {}),
    ...(optionalParsed(organizationTypeSchema, input.orgType)
      ? { orgType: input.orgType as OrganizationType }
      : {}),
    ...(optionalParsed(accountRoleSchema, input.accountRole)
      ? {
          accountRole: input.accountRole as
            | "student"
            | "parent"
            | "coach",
        }
      : {}),
    ...(optionalParsed(membershipRoleSchema, input.membershipRole)
      ? { membershipRole: input.membershipRole as OrgMemberRole }
      : {}),
    ...(optionalParsed(membershipStatusSchema, input.membershipStatus)
      ? { membershipStatus: input.membershipStatus as OrgMemberStatus }
      : {}),
    ...(cursor ? { cursor } : {}),
    direction:
      cursor && input.direction === "previous" ? "previous" : "next",
  };
}

export function adminUsersHaveFilters(filters: AdminUserFilters): boolean {
  return Boolean(
    filters.q ||
      filters.districtId ||
      filters.orgId ||
      filters.orgType ||
      filters.accountRole ||
      filters.membershipRole ||
      filters.membershipStatus
  );
}

export function adminUsersHref(
  filters: AdminUserFilters,
  overrides: Partial<AdminUserFilters> = {}
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.access === "admins") params.set("access", "admins");
  if (merged.q) params.set("q", merged.q);
  if (merged.districtId) params.set("district", merged.districtId);
  if (merged.orgId) params.set("org", merged.orgId);
  if (merged.orgType) params.set("orgType", merged.orgType);
  if (merged.accountRole) params.set("accountRole", merged.accountRole);
  if (merged.membershipRole) {
    params.set("membershipRole", merged.membershipRole);
  }
  if (merged.membershipStatus) {
    params.set("membershipStatus", merged.membershipStatus);
  }
  if (merged.cursor) {
    params.set("cursor", encodeAdminUserCursor(merged.cursor));
    params.set("direction", merged.direction);
  }
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export function adminUsersClearHref(filters: AdminUserFilters): string {
  return filters.access === "admins"
    ? "/admin/users?access=admins"
    : "/admin/users";
}
