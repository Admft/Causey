import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("early-build chrome", () => {
  it("does not mount EarlyBuildBanner in the root layout", () => {
    const layout = read("app/layout.tsx");
    expect(layout).not.toContain("EarlyBuildBanner");
    expect(layout).toContain("SiteHeader");
  });

  it("renders nothing if EarlyBuildBanner is imported anyway", () => {
    const banner = read("components/EarlyBuildBanner.tsx");
    expect(banner).toContain("return null");
    expect(banner).not.toContain("Early build.");
  });
});
