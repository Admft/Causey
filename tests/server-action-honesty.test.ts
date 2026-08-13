import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getSessionUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
  getCurrentProfile: mocks.getCurrentProfile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/actions/in-app-notifications", () => ({
  createInAppNotifications: vi.fn().mockResolvedValue({
    requested: 0,
    created: 0,
    failures: [],
  }),
}));

describe("server action mutation honesty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "user-1" });
    mocks.getCurrentProfile.mockResolvedValue({ id: "user-1" });
  });

  it("does not report success when entrant deletion affects no rows", async () => {
    const query = {
      delete: vi.fn(),
      eq: vi.fn(),
    };
    query.delete.mockReturnValue(query);
    query.eq
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ count: 0, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => query),
    });
    const { removeEntrant } = await import("@/lib/actions/entrants");

    const result = await removeEntrant("competition-1", "fall-open", "student-1");

    expect(result).toEqual({
      ok: false,
      error: "That entrant was not found or could not be removed.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report saved organization settings after an RLS no-op", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ count: 0, error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn(() => query),
    });
    const { updateOrganizationSettings } = await import("@/lib/actions/district");

    const result = await updateOrganizationSettings({
      orgId: "11111111-1111-4111-8111-111111111111",
      orgSlug: "school",
      name: "School",
      state: "TX",
    });

    expect(result).toEqual({
      ok: false,
      error: "The organization was not found or its settings could not be saved.",
    });
  });

  it("checks competition management before writing attendance", async () => {
    const from = vi.fn();
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from,
    });
    const { markEntrantAttendance } = await import("@/lib/actions/district");

    const result = await markEntrantAttendance({
      competitionId: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      eventSlug: "fall-open",
      status: "attended",
    });

    expect(result).toEqual({
      ok: false,
      error: "Only competition staff can record attendance.",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("keeps existing group members when fallback insertion fails", async () => {
    const currentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
    };
    currentQuery.select.mockReturnValue(currentQuery);
    currentQuery.eq.mockResolvedValue({
      data: [{ profile_id: "11111111-1111-4111-8111-111111111111" }],
      error: null,
    });
    const insertQuery = {
      insert: vi.fn(),
      select: vi.fn(),
    };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });
    const removeQuery = { delete: vi.fn() };
    const from = vi
      .fn()
      .mockReturnValueOnce(currentQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValue(removeQuery);
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST202", message: "Could not find set_group_members" },
      }),
      from,
    });
    const { setGroupMembers } = await import("@/lib/actions/groups");

    const result = await setGroupMembers(
      "33333333-3333-4333-8333-333333333333",
      "school",
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ]
    );

    expect(result).toEqual({
      ok: false,
      error: "Could not add the selected members. Existing members were kept.",
    });
    expect(removeQuery.delete).not.toHaveBeenCalled();
  });
});
