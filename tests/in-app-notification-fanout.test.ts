import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getSessionUser: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

describe("in-app notification fanout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "actor-1" });
  });

  it("aggregates recipient failures without hiding successful writes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: "notification-1", error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "42501", message: "permission denied" },
      })
      .mockResolvedValueOnce({ data: "notification-3", error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });
    const { createInAppNotifications } = await import(
      "@/lib/actions/in-app-notifications"
    );

    const result = await createInAppNotifications(
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ].map((recipientId, index) => ({
        recipientId,
        kind: "announcement" as const,
        title: `Update ${index + 1}`,
        body: "Practice moved.",
        href: "/orgs/school",
      }))
    );

    expect(result).toEqual({
      requested: 3,
      created: 2,
      failures: [
        {
          index: 1,
          error: "You don’t have permission to complete this action.",
        },
      ],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/me/notifications");
  });
});
