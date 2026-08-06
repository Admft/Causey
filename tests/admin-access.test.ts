import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
}));

describe("platform admin actions", () => {
  beforeEach(() => {
    mocks.getPlatformAdminUser.mockReset();
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
