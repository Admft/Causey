import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/auth/next-path";

describe("sanitizeNextPath", () => {
  it("keeps a same-site path and query", () => {
    expect(sanitizeNextPath("/join/BCDFGHJK?from=invite")).toBe(
      "/join/BCDFGHJK?from=invite"
    );
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(sanitizeNextPath("https://example.com")).toBeUndefined();
    expect(sanitizeNextPath("//example.com")).toBeUndefined();
    expect(sanitizeNextPath("/\\example.com")).toBeUndefined();
  });

  it("rejects an empty destination", () => {
    expect(sanitizeNextPath(undefined)).toBeUndefined();
    expect(sanitizeNextPath(null)).toBeUndefined();
  });
});
