import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  hashedRequestActorKey: vi.fn(),
  getServiceRoleClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMIT_MESSAGE:
    "That action is happening too often. Wait a minute and try again.",
  consumeRateLimit: mocks.consumeRateLimit,
  hashedRequestActorKey: mocks.hashedRequestActorKey,
}));

vi.mock("@/lib/supabase/client", () => ({
  getServiceRoleClient: mocks.getServiceRoleClient,
}));

import { assertSignupAllowed } from "@/lib/actions/signup-guard";

describe("invitation signup email preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.hashedRequestActorKey.mockResolvedValue("request");
    const query = {
      select: mocks.select,
      eq: mocks.eq,
      limit: mocks.limit,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.limit.mockReturnValue(query);
    mocks.getServiceRoleClient.mockReturnValue({ from: mocks.from });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        email: "admin@causey.dev",
        status: "pending",
        expires_at: "2099-01-01T00:00:00.000Z",
      },
      error: null,
    });
  });

  it("allows the exact invited address regardless of letter case", async () => {
    const token = "a".repeat(64);

    await expect(
      assertSignupAllowed({
        next: `/claim/${token}`,
        email: " ADMIN@CAUSEY.DEV ",
      })
    ).resolves.toEqual({ ok: true });
    expect(mocks.eq).toHaveBeenCalledWith(
      "token_hash",
      createHash("sha256").update(token).digest("hex")
    );
  });

  it("blocks a different address before account creation", async () => {
    await expect(
      assertSignupAllowed({
        next: `/claim/${"b".repeat(64)}`,
        email: "another@causey.dev",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Use the exact email address this invitation was sent to.",
    });
  });

  it("also checks activation-code signup paths by exact email", async () => {
    await expect(
      assertSignupAllowed({
        next: "/claim?code=BCDF-GHJK",
        email: "admin@causey.dev",
      })
    ).resolves.toEqual({ ok: true });
    expect(mocks.eq).toHaveBeenCalledWith(
      "activation_code_hash",
      createHash("sha256").update("BCDFGHJK").digest("hex")
    );
  });

  it("fails closed when the invitation is expired", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        email: "admin@causey.dev",
        status: "pending",
        expires_at: "2020-01-01T00:00:00.000Z",
      },
      error: null,
    });

    await expect(
      assertSignupAllowed({
        next: `/claim/${"c".repeat(64)}`,
        email: "admin@causey.dev",
      })
    ).resolves.toEqual({
      ok: false,
      error:
        "This invitation is no longer available. Return to the claim page and request a new invitation if needed.",
    });
  });
});
