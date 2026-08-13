import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("@/lib/supabase/client", () => ({
  getServiceRoleClient: mocks.getServiceRoleClient,
}));
vi.mock("@/lib/email/config", () => ({
  absoluteCauseyUrl: (path: string | null) => `https://causey.example${path ?? ""}`,
  hasProductEmailConfig: () => true,
  getProductEmailConfig: () => ({
    apiKey: "test-key",
    from: "Causey <updates@example.com>",
  }),
}));
vi.mock("@/lib/email/template", () => ({
  renderProductEmail: () => ({ html: "<p>Update</p>", text: "Update" }),
}));

describe("email outbox delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delivers with bounded concurrency and verifies claimed-row updates", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `outbox-${index}`,
      recipient_email: `person-${index}@example.com`,
      template: "notification",
      payload: {
        kind: "announcement",
        title: "School update",
        body: "Practice moved.",
        href: "/orgs/school",
      },
      dedupe_key: `announcement-${index}`,
      attempts: 1,
    }));
    const finalized: Record<string, unknown>[] = [];
    const service = {
      rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
      from: vi.fn((table: string) => {
        expect(table).toBe("email_outbox");
        const query = {
          update: vi.fn((values: Record<string, unknown>) => {
            finalized.push(values);
            return query;
          }),
          eq: vi.fn(() => query),
          select: vi.fn(() => query),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "updated" },
            error: null,
          }),
        };
        return query;
      }),
    };
    mocks.getServiceRoleClient.mockReturnValue(service);

    let active = 0;
    let maxActive = 0;
    mocks.send.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { data: { id: "resend-message" }, error: null };
    });

    const { deliverPendingEmailOutbox } = await import("@/lib/email/delivery");
    const result = await deliverPendingEmailOutbox(25);

    expect(result).toEqual({
      claimed: 12,
      sent: 12,
      failed: 0,
      skipped: false,
    });
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(5);
    expect(finalized).toHaveLength(12);
    expect(finalized.every((values) => values.status === "sent")).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^causey\/announcement-/),
      })
    );
  });

  it("releases failed sends for a later idempotent retry", async () => {
    const finalized: Record<string, unknown>[] = [];
    const query = {
      update: vi.fn((values: Record<string, unknown>) => {
        finalized.push(values);
        return query;
      }),
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "outbox-1" },
        error: null,
      }),
    };
    mocks.getServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            id: "outbox-1",
            recipient_email: "person@example.com",
            template: "notification",
            payload: {
              kind: "announcement",
              title: "School update",
              body: "Practice moved.",
              href: "/orgs/school",
            },
            dedupe_key: "announcement-1",
            attempts: 1,
          },
        ],
        error: null,
      }),
      from: vi.fn(() => query),
    });
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: "Provider unavailable" },
    });
    const { deliverPendingEmailOutbox } = await import("@/lib/email/delivery");

    const result = await deliverPendingEmailOutbox();

    expect(result).toEqual({
      claimed: 1,
      sent: 0,
      failed: 1,
      skipped: false,
    });
    expect(finalized).toEqual([
      expect.objectContaining({
        status: "failed",
        locked_at: null,
        last_error: "Provider unavailable",
        send_after: expect.any(String),
      }),
    ]);
  });
});
