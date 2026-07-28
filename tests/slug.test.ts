import { describe, expect, it } from "vitest";
import { slugify, slugifyName, withSlugSuffix } from "@/lib/slug";

describe("slugifyName", () => {
  it("lowercases and collapses non-alphanumerics", () => {
    expect(slugifyName("Lincoln Chess Club!")).toBe("lincoln-chess-club");
    expect(slugifyName("  PS 41 — Knights  ")).toBe("ps-41-knights");
  });

  it("caps length at 60", () => {
    expect(slugifyName("x".repeat(80))).toHaveLength(60);
  });
});

describe("slugify", () => {
  it("appends the start date, matching ingestion slugs", () => {
    expect(slugify("Spring Open", "2026-04-11")).toBe("spring-open-2026-04-11");
  });
});

describe("withSlugSuffix", () => {
  it("appends the attempt counter", () => {
    expect(withSlugSuffix("spring-open-2026-04-11", 2)).toBe(
      "spring-open-2026-04-11-2"
    );
  });
});
