import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  districtDeleteConfirmationPhrase,
  matchesOrgDeleteConfirmation,
} from "@/lib/admin-org-delete";

const mocks = vi.hoisted(() => ({
  getSuperAdminUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: vi.fn(),
  getSuperAdminUser: mocks.getSuperAdminUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}));

describe("admin delete district", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0090_admin_delete_district.sql"),
    "utf8"
  );

  it("reserves district deletion for super admins and removes child schools", () => {
    expect(sql).toContain("create or replace function public.admin_delete_district");
    expect(sql).toContain("super_admin_required");
    expect(sql).toContain("not_a_district");
    expect(sql).toContain("is_super_admin()");
    expect(sql).toContain("'delete_district'");
    expect(sql).toContain("parent_org_id = dist_id");
    expect(sql).toContain("delete from public.competitions");
    expect(sql).toContain("revoke execute on function public.admin_delete_district(uuid)");
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_delete_district\(uuid\)\s+to anon/i
    );
  });

  it("requires typing DELETE plus the district slug", () => {
    expect(districtDeleteConfirmationPhrase("lincoln-usd")).toBe(
      "DELETE lincoln-usd"
    );
    expect(matchesOrgDeleteConfirmation("DELETE la_usd", "la-usd")).toBe(
      true
    );
    expect(matchesOrgDeleteConfirmation("delete lincoln-usd", "lincoln-usd")).toBe(
      true
    );
    expect(
      matchesOrgDeleteConfirmation("DELETE wrong-slug", "lincoln-usd")
    ).toBe(false);
    const form = readFileSync(
      resolve(process.cwd(), "components/AdminDistrictDeleteForm.tsx"),
      "utf8"
    );
    const explorer = readFileSync(
      resolve(process.cwd(), "components/AdminOrganizationsExplorer.tsx"),
      "utf8"
    );
    const action = readFileSync(
      resolve(process.cwd(), "lib/actions/admin.ts"),
      "utf8"
    );
    const schoolSql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/0101_admin_delete_school.sql"),
      "utf8"
    );
    expect(form).toContain("adminDeleteDistrict");
    expect(form).toContain("adminDeleteSchool");
    expect(form).toContain('orgType === "school"');
    expect(explorer).toContain("AdminDistrictDeleteForm");
    expect(explorer).toContain("canDeleteDistrict={canProvisionDistrict}");
    expect(explorer).toContain('org.type === "school"');
    expect(action).toContain("admin_delete_school");
    expect(schoolSql).toContain("create or replace function public.admin_delete_school");
    expect(schoolSql).toContain("not_a_school");
    expect(schoolSql).toContain("'delete_school'");
  });
});

describe("adminDeleteDistrict action", () => {
  beforeEach(() => {
    mocks.getSuperAdminUser.mockReset();
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it("rejects deletion before writing for non-super-admins", async () => {
    mocks.getSuperAdminUser.mockResolvedValue(null);
    const { adminDeleteDistrict } = await import("@/lib/actions/admin");

    await expect(
      adminDeleteDistrict({
        districtId: "00000000-0000-0000-0000-000000000001",
        confirmation: "DELETE lincoln-usd",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Founder super-admin access required.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects when the typed phrase does not match the district slug", async () => {
    mocks.getSuperAdminUser.mockResolvedValue({ id: "admin" });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "00000000-0000-0000-0000-000000000001",
              name: "Lincoln USD",
              slug: "lincoln-usd",
              type: "district",
            },
            error: null,
          }),
        }),
      }),
    });
    const { adminDeleteDistrict } = await import("@/lib/actions/admin");

    await expect(
      adminDeleteDistrict({
        districtId: "00000000-0000-0000-0000-000000000001",
        confirmation: "DELETE wrong-slug",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Type DELETE lincoln-usd to confirm deletion.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("accepts an underscore in the slug confirmation", async () => {
    mocks.getSuperAdminUser.mockResolvedValue({ id: "admin" });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "00000000-0000-0000-0000-000000000001",
              name: "Lincoln USD",
              slug: "lincoln-usd",
              type: "district",
            },
            error: null,
          }),
        }),
      }),
    });
    mocks.rpc.mockResolvedValue({
      data: {
        name: "Lincoln USD",
        slug: "lincoln-usd",
        schools_deleted: 0,
        competitions_deleted: 0,
      },
      error: null,
    });
    const { adminDeleteDistrict } = await import("@/lib/actions/admin");

    await expect(
      adminDeleteDistrict({
        districtId: "00000000-0000-0000-0000-000000000001",
        confirmation: "DELETE lincoln_usd",
      })
    ).resolves.toMatchObject({ ok: true, slug: "lincoln-usd" });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_delete_district", {
      p_district_id: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("rejects school deletion before writing for non-super-admins", async () => {
    mocks.getSuperAdminUser.mockResolvedValue(null);
    const { adminDeleteSchool } = await import("@/lib/actions/admin");
    await expect(
      adminDeleteSchool({
        schoolId: "00000000-0000-0000-0000-000000000002",
        confirmation: "DELETE test-school-district",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Founder super-admin access required.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
