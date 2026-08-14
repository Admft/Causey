import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
  getSuperAdminUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
  getSuperAdminUser: mocks.getSuperAdminUser,
}));

describe("platform admin actions", () => {
  beforeEach(() => {
    mocks.getPlatformAdminUser.mockReset();
    mocks.getSuperAdminUser.mockReset();
  });

  it("rejects organization creation before parsing or writing for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { adminCreateOrganization } = await import("@/lib/actions/admin");

    await expect(
      adminCreateOrganization({
        name: "Example District",
        type: "district",
        state: "CO",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });

  it("rejects tournament status changes for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { adminSetTournamentStatus } = await import("@/lib/actions/admin");

    await expect(
      adminSetTournamentStatus({
        competitionId: "00000000-0000-0000-0000-000000000000",
        eventSlug: "example",
        status: "archived",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });

  it("rejects user access changes for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { adminUpdateUserAccess } = await import("@/lib/actions/admin");

    await expect(
      adminUpdateUserAccess({
        profileId: "00000000-0000-0000-0000-000000000000",
        accountRole: "coach",
        platformAdmin: true,
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });

  it("rejects user searches for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { adminSearchUsers } = await import("@/lib/actions/admin");

    await expect(
      adminSearchUsers({ query: "student@example.com", page: 1 })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });

  it("rejects organization verification for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { adminReviewOrganization } = await import("@/lib/actions/admin");

    await expect(
      adminReviewOrganization({
        orgId: "00000000-0000-0000-0000-000000000000",
        orgSlug: "example-school",
        status: "verified",
        note: "",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });
});

describe("platform admin migration", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0015_platform_admins.sql"),
    "utf8"
  );

  it("keeps platform authority separate from editable profiles", () => {
    expect(sql).toContain("create table public.platform_admins");
    expect(sql).not.toMatch(/add column[^;]*is_platform_admin/i);
    expect(sql).toContain("revoke update on public.profiles from anon, authenticated");

    const profileGrant = sql.match(
      /grant update \(([\s\S]*?)\) on public\.profiles to authenticated;/
    );
    expect(profileGrant?.[1]).toBeDefined();
    expect(profileGrant?.[1]).not.toContain("role");
    expect(profileGrant?.[1]).not.toContain("role_unlocked");
  });

  it("promotes the named existing accounts and makes the audit log append-only", () => {
    expect(sql).toContain("adam.mophat@gmail.com");
    expect(sql).toContain("mcausey.th@gmail.com");
    expect(sql).toContain("create table public.admin_audit_log");
    expect(sql).toContain(
      "revoke all on public.admin_audit_log from public, anon, authenticated"
    );
    expect(sql).toContain("grant select on public.admin_audit_log to authenticated");
    expect(sql).not.toMatch(/grant (update|delete)[^;]*admin_audit_log/i);
  });
});

describe("platform user directory migration", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0026_platform_user_directory.sql"
    ),
    "utf8"
  );
  const typeFixSql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0031_platform_user_directory_types.sql"
    ),
    "utf8"
  );

  it("keeps email lookup behind an admin-checked RPC", () => {
    expect(sql).toContain("create or replace function public.search_platform_users");
    expect(sql).toContain("join auth.users u on u.id = p.id");
    expect(sql).toContain("not public.is_platform_admin()");
    expect(sql).toContain(
      "revoke execute on function public.search_platform_users"
    );
    expect(sql).not.toMatch(/grant select[^;]*auth\.users/i);
  });

  it("guards privilege changes and records them", () => {
    expect(sql).toContain("cannot_change_own_access");
    expect(sql).toContain("cannot_remove_last_platform_admin");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("invalid_account_role");
    expect(sql).toContain("insert into public.admin_audit_log");
    expect(sql).toContain("'update_access'");
    expect(sql).not.toMatch(
      /update public\.profiles[\s\S]*?set[\s\S]*?role_unlocked\s*=/i
    );
  });

  it("matches Supabase auth email to the RPC text return type", () => {
    expect(sql).toContain("coalesce(u.email, '')::text");
    expect(typeFixSql).toContain("coalesce(u.email, '')::text");
    expect(typeFixSql).toContain("p.role::text");
  });
});
