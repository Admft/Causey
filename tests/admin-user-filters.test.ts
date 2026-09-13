import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adminUsersClearHref,
  adminUsersHref,
  decodeAdminUserCursor,
  encodeAdminUserCursor,
  parseAdminUserFilters,
} from "@/lib/admin-user-filters";

const DISTRICT_ID = "00000000-0000-4000-8000-000000000001";
const SCHOOL_ID = "00000000-0000-4000-8000-000000000002";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("admin user filter URLs", () => {
  it("parses the complete supported filter set and rejects bad values", () => {
    expect(
      parseAdminUserFilters({
        access: "admins",
        q: "  Rivera  ",
        district: DISTRICT_ID,
        org: SCHOOL_ID,
        orgType: "school",
        accountRole: "coach",
        membershipRole: "school_admin",
        membershipStatus: "active",
      })
    ).toMatchObject({
      access: "admins",
      q: "Rivera",
      districtId: DISTRICT_ID,
      orgId: SCHOOL_ID,
      orgType: "school",
      accountRole: "coach",
      membershipRole: "school_admin",
      membershipStatus: "active",
      direction: "next",
    });
    expect(
      parseAdminUserFilters({
        district: "not-an-id",
        orgType: "company",
        membershipRole: "owner",
      })
    ).toEqual({ access: "all", direction: "next" });
  });

  it("round-trips an opaque stable cursor and preserves filters in links", () => {
    const cursor = {
      name: "alex rivera",
      email: "alex@example.org",
      id: SCHOOL_ID,
    };
    expect(decodeAdminUserCursor(encodeAdminUserCursor(cursor))).toEqual(cursor);
    const href = adminUsersHref(
      parseAdminUserFilters({
        access: "admins",
        q: "alex",
        district: DISTRICT_ID,
      }),
      { cursor, direction: "next" }
    );
    expect(href).toContain("access=admins");
    expect(href).toContain("q=alex");
    expect(href).toContain(`district=${DISTRICT_ID}`);
    expect(href).toContain("cursor=");
    expect(href).toContain("direction=next");
    expect(decodeAdminUserCursor("not-a-cursor")).toBeUndefined();
  });

  it("clears narrowing filters without losing the access scope", () => {
    expect(
      adminUsersClearHref(
        parseAdminUserFilters({ access: "admins", q: "student" })
      )
    ).toBe("/admin/users?access=admins");
  });
});

describe("indexed platform user filter migration", () => {
  const migration = read("supabase/migrations/0095_admin_user_filters.sql");

  it("keeps email and organization lookup behind platform-admin RPCs", () => {
    expect(migration).toContain("search_platform_users_filtered");
    expect(migration).toContain("search_admin_organization_scopes");
    expect(migration.match(/platform_admin_required/g)?.length).toBeGreaterThanOrEqual(
      2
    );
    expect(migration).toContain("revoke execute on function");
    expect(migration).not.toMatch(/grant select[^;]*auth\.users/i);
    expect(migration).not.toMatch(/create index[^;]*on auth\.users/i);
  });

  it("uses indexed text and membership predicates with keyset pagination", () => {
    expect(migration).toContain("gin_trgm_ops");
    expect(migration).toContain("org_memberships_directory_idx");
    expect(migration).toContain(
      "(filtered.sort_name, filtered.sort_email, filtered.profile_id) >"
    );
    expect(migration).toContain("limit safe_limit + 1");
    expect(migration).not.toContain("p_offset");
  });

  it("defines district scope as direct district or connected-school membership", () => {
    expect(migration).toContain("organization.id = p_district_id");
    expect(migration).toContain(
      "organization.parent_org_id = p_district_id"
    );
    expect(migration).toContain("exists (");
    expect(migration).not.toContain("household_links");
  });

  it("supports every operational membership role and status", () => {
    for (const role of [
      "student",
      "assistant_coach",
      "coach",
      "school_admin",
      "district_admin",
      "admin",
    ]) {
      expect(migration).toContain(`'${role}'`);
    }
    for (const status of ["active", "invited", "removed"]) {
      expect(migration).toContain(`'${status}'`);
    }
  });
});

describe("admin user membership context", () => {
  const membershipMigration = read(
    "supabase/migrations/0096_claim_and_admin_membership_context.sql"
  );
  const directory = read("components/AdminUserDirectory.tsx");

  it("always returns staff-first memberships on name search", () => {
    expect(membershipMigration).toContain(
      "coalesce(matched.items, '[]'::jsonb) as matching_memberships"
    );
    expect(membershipMigration).not.toContain(
      "when has_membership_filter then coalesce(matched.items"
    );
    expect(membershipMigration).toContain("when 'district_admin' then 0");
    expect(membershipMigration).toContain("limit 3");
  });

  it("labels claimed district staff as district staff, not the coach account type", () => {
    expect(directory).toContain("staffAccountPersonaLabel");
    expect(directory).toContain("accountExperienceLabel");
    expect(directory).toContain("Coach / organizer (account type)");
  });
});
