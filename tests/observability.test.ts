import { describe, expect, it } from "vitest";
import { reportError } from "@/lib/observability";

describe("optional Sentry reporting", () => {
  it("does not throw when SENTRY_DSN is unset", () => {
    const previous = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(() => reportError(new Error("test"), "unit")).not.toThrow();
    if (previous === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previous;
  });
});
