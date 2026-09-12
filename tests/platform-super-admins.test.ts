import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
  getSuperAdminUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
  getSuperAdminUser: mocks.getSuperAdminUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc: mocks.rpc }),
}));

describe("platform super-admin migration", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0058_platform_super_admins.sql"),
    "utf8"
  );

  it("adds a protected super_admin flag without a profile role", () => {
    expect(sql).toContain("add column if not exists super_admin boolean");
    expect(sql).toContain("create or replace function public.is_super_admin()");
    expect(sql).toContain("where a.profile_id = auth.uid()");
    expect(sql).not.toMatch(/add column[^;]*is_super_admin/i);
    expect(sql).toContain("adam.mophat@gmail.com");
    expect(sql).toContain("mcausey.th@gmail.com");
  });

  it("blocks in-app demotion, deletion, and super-admin grants", () => {
    expect(sql).toContain("cannot_modify_super_admin");
    expect(sql).toContain("super_admin_grant_requires_migration");
    expect(sql).toContain("guard_platform_super_admin_row");
    expect(sql).toContain("current_user in ('postgres', 'supabase_admin')");
    expect(sql).not.toContain("grant execute on function public.guard_platform_super_admin_row()");
  });

  it("reserves platform-admin grants and user deletion for super admins", () => {
    expect(sql).toContain("super_admin_required");
    expect(sql).toContain("create or replace function public.delete_platform_user");
    expect(sql).toContain("cannot_delete_own_account");
    expect(sql).toContain("delete from auth.users");
    expect(sql).toContain("'delete_user'");
    expect(sql).toContain("coalesce(a.super_admin, false)");
    expect(sql).toContain("revoke execute on function public.delete_platform_user(uuid)");
    expect(sql).not.toMatch(
      /grant execute on function public\.delete_platform_user\(uuid\)\s+to anon/i
    );
  });
});

describe("founder account role edits", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0092_founder_account_role_edits.sql"
    ),
    "utf8"
  );
  const form = readFileSync(
    resolve(process.cwd(), "components/AdminUserAccessForm.tsx"),
    "utf8"
  );

  it("lets founders change account experience without demoting platform admin", () => {
    expect(sql).toContain("previous_super and not p_platform_admin");
    expect(sql).toContain("p_profile_id = actor and privilege_changed");
    expect(sql).toContain("cannot_modify_super_admin");
    expect(sql).toContain("cannot_change_own_access");
    expect(form).toContain("Account experience can change");
    expect(form).toContain("platformAdminLocked");
    expect(form).not.toContain("Your own access is read-only here");
  });
});

describe("delete user missing review-table guard", () => {
  const sql0091 = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0091_delete_user_missing_review_table.sql"
    ),
    "utf8"
  );
  const sql0093 = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0093_delete_own_account_nested_review_guard.sql"
    ),
    "utf8"
  );

  it("skips organization_verification_reviews when the table was never applied", () => {
    expect(sql0091).toContain(
      "to_regclass('public.organization_verification_reviews')"
    );
    expect(sql0091).toContain("create or replace function public.delete_platform_user");
    expect(sql0091).toContain("create or replace function public.delete_own_account");
  });

  it("nests the review-history check so a missing table does not fail planning", () => {
    expect(sql0093).toContain("create or replace function public.delete_own_account");
    expect(sql0093).toContain(
      "if to_regclass('public.organization_verification_reviews') is not null then"
    );
    expect(sql0093).toContain("into has_review_history");
    expect(sql0093).not.toMatch(
      /to_regclass\('public\.organization_verification_reviews'\) is not null\s+and exists/s
    );
  });
});

describe("adminDeleteUser action", () => {
  beforeEach(() => {
    mocks.getPlatformAdminUser.mockReset();
    mocks.getSuperAdminUser.mockReset();
    mocks.rpc.mockReset();
  });

  it("rejects deletion before writing for non-super-admins", async () => {
    mocks.getSuperAdminUser.mockResolvedValue(null);
    const { adminDeleteUser } = await import("@/lib/actions/admin");

    await expect(
      adminDeleteUser({
        profileId: "00000000-0000-0000-0000-000000000000",
        confirmationEmail: "student@example.com",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Founder super-admin access required.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
