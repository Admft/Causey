import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

type QueryResult = {
  data: unknown;
  error: null | { code: string; message: string };
};

function queryReturning(result: QueryResult) {
  const query: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "order",
    "gt",
    "maybeSingle",
  ]) {
    query[method] = vi.fn(() => query);
  }
  query.then = (
    resolveResult: (value: QueryResult) => unknown,
    rejectResult?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolveResult, rejectResult);
  return query;
}

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district data reads fail closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("distinguishes a rollup RPC failure from an empty report", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "read failed" },
      }),
    });
    const { getDistrictSchoolRollup } = await import("@/lib/data/district");

    await expect(getDistrictSchoolRollup("district-a")).resolves.toEqual({
      ok: false,
    });
  });

  it("fails a participation report when either attribution read fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "XX000", message: "district-hosted read failed" },
        })
        .mockResolvedValueOnce({ data: [], error: null }),
    });
    const { getDistrictParticipationReport } = await import(
      "@/lib/data/district"
    );

    await expect(
      getDistrictParticipationReport("district-a")
    ).resolves.toEqual({ ok: false });
  });

  it("fails a participation report when origin-school attribution fails", async () => {
    const districtHosted = {
      upcoming_tournaments: 2,
      invitations_pending: 5,
      going_count: 3,
      attended_this_season: 6,
    };
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [districtHosted], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "XX000", message: "origin read failed" },
        }),
    });
    const { getDistrictParticipationReport } = await import(
      "@/lib/data/district"
    );

    await expect(
      getDistrictParticipationReport("district-a")
    ).resolves.toEqual({ ok: false });
  });

  it("returns school and district-hosted aggregates without merging them", async () => {
    const school = {
      school_id: "school-a",
      school_name: "School A",
      active_students: 12,
      upcoming_tournaments: 1,
      invitations_pending: 3,
      going_count: 2,
      attended_this_season: 4,
    };
    const districtHosted = {
      upcoming_tournaments: 2,
      invitations_pending: 5,
      going_count: 3,
      attended_this_season: 6,
    };
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: [school], error: null })
        .mockResolvedValueOnce({ data: [districtHosted], error: null })
        .mockResolvedValueOnce({ data: [], error: null }),
    });
    const { getDistrictParticipationReport } = await import(
      "@/lib/data/district"
    );

    await expect(
      getDistrictParticipationReport("district-a")
    ).resolves.toEqual({
      ok: true,
      data: {
        schools: [school],
        districtHosted,
        hostedBySchool: [],
        category: null,
      },
    });
  });

  it("does not call a failed school query an empty district", async () => {
    const district = queryReturning({
      data: {
        id: "district-a",
        name: "District A",
        slug: "district-a",
        parent_org_id: null,
        owner_profile_id: "operator-a",
        verification_status: "verified",
      },
      error: null,
    });
    const schools = queryReturning({
      data: null,
      error: { code: "XX000", message: "school read failed" },
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce(district)
        .mockReturnValueOnce(schools),
    });
    const { getDistrictPilotReadiness } = await import("@/lib/data/district");

    await expect(getDistrictPilotReadiness("district-a")).resolves.toEqual({
      ok: false,
    });
  });

  it("fails the whole readiness read when membership details fail", async () => {
    const successful = (data: unknown) =>
      queryReturning({ data, error: null });
    const membershipFailure = queryReturning({
      data: null,
      error: { code: "42501", message: "membership read denied" },
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          successful({
            id: "district-a",
            name: "District A",
            slug: "district-a",
            parent_org_id: null,
            owner_profile_id: "operator-a",
            verification_status: "verified",
          })
        )
        .mockReturnValueOnce(
          successful([
            {
              id: "school-a",
              name: "School A",
              slug: "school-a",
              parent_org_id: "district-a",
              owner_profile_id: "operator-a",
              verification_status: "verified",
            },
          ])
        )
        .mockReturnValueOnce(membershipFailure)
        .mockReturnValueOnce(successful([]))
        .mockReturnValueOnce(successful([])),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const { getDistrictPilotReadiness } = await import("@/lib/data/district");

    await expect(getDistrictPilotReadiness("district-a")).resolves.toEqual({
      ok: false,
    });
  });

  it("fails the whole readiness read when the school rollup fails", async () => {
    const successful = (data: unknown) =>
      queryReturning({ data, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce(
          successful({
            id: "district-a",
            name: "District A",
            slug: "district-a",
            parent_org_id: null,
            owner_profile_id: "operator-a",
            verification_status: "verified",
          })
        )
        .mockReturnValueOnce(
          successful([
            {
              id: "school-a",
              name: "School A",
              slug: "school-a",
              parent_org_id: "district-a",
              owner_profile_id: "operator-a",
              verification_status: "verified",
            },
          ])
        )
        .mockReturnValueOnce(successful([]))
        .mockReturnValueOnce(successful([]))
        .mockReturnValueOnce(successful([])),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "rollup failed" },
      }),
    });
    const { getDistrictPilotReadiness } = await import("@/lib/data/district");

    await expect(getDistrictPilotReadiness("district-a")).resolves.toEqual({
      ok: false,
    });
  });

  it("preserves a successful, genuinely empty district", async () => {
    const district = queryReturning({
      data: {
        id: "district-a",
        name: "District A",
        slug: "district-a",
        parent_org_id: null,
        owner_profile_id: "operator-a",
        verification_status: "verified",
      },
      error: null,
    });
    const schools = queryReturning({ data: [], error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValueOnce(district)
        .mockReturnValueOnce(schools),
    });
    const { getDistrictPilotReadiness } = await import("@/lib/data/district");

    await expect(getDistrictPilotReadiness("district-a")).resolves.toEqual({
      ok: true,
      data: {
        districtId: "district-a",
        districtSlug: "district-a",
        verificationStatus: "verified",
        schools: [],
      },
    });
  });
});

describe("district read failure surfaces", () => {
  it("offers retry actions without showing empty-state claims", () => {
    const overview = source("app/orgs/[slug]/page.tsx");
    const reports = source("app/orgs/[slug]/reports/page.tsx");
    const csv = source("app/orgs/[slug]/reports/export/route.ts");

    expect(overview).toContain("School readiness could not load");
    expect(overview).toContain("Retry school readiness");
    expect(reports).toContain("District reporting could not load");
    expect(reports).toContain("No totals or CSV were generated.");
    expect(reports).toContain("District-hosted competitions");
    expect(reports).toContain("They are not");
    expect(reports).toContain("District-hosted by participating school");
    expect(reports).toContain("Retry season attendance");
    expect(csv).toContain("status: 503");
    expect(csv).toContain('"Cache-Control": "private, no-store"');
    expect(csv).toContain('"District-hosted"');
    expect(csv).toContain('"School-hosted"');
    expect(csv).toContain('"District-hosted by school"');
    expect(csv).toContain("Season attendance is temporarily unavailable");
  });
});
