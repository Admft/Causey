import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getSessionUser: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

describe("personal RSVP account refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates the account schedule after a successful Going response", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockResolvedValue({
      data: [{ profile_id: "student-1" }],
      error: null,
    });

    mocks.getSessionUser.mockResolvedValue({ id: "student-1" });
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => query),
    });

    const { setRsvp } = await import("@/lib/actions/entrants");
    const result = await setRsvp({
      competitionId: "competition-1",
      profileId: "student-1",
      status: "going",
      eventSlug: "spring-open",
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/orgs");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/family");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/event/spring-open");
  });
});
