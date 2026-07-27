import { describe, expect, it } from "vitest";
import { pathwayInputHash, triagePathway } from "../ingestion/pathway-triage";

describe("pathway triage", () => {
  it("links known series without AI", () => {
    const t = triagePathway("2026 Denker Tournament of High School Champions", "TX");
    expect(t.kind).toBe("known_series");
    if (t.kind === "known_series") {
      expect(t.seriesId).toContain("00000000");
    }
  });

  it("marks weekend swiss as none", () => {
    const t = triagePathway("Dallas Weekend Swiss G/60", "TX");
    expect(t.kind).toBe("none");
  });

  it("flags scholastic championships for AI", () => {
    const t = triagePathway("Ohio Scholastic Championship", "OH");
    expect(t.kind).toBe("needs_ai");
  });

  it("hashes are stable for identical inputs", () => {
    const a = pathwayInputHash({
      name: "Test Open",
      state: "NY",
      city: "Albany",
      organizer_name: null,
      source: "tla_scrape",
      series_id: null,
    });
    const b = pathwayInputHash({
      name: "Test Open",
      state: "NY",
      city: "Albany",
      organizer_name: null,
      source: "tla_scrape",
      series_id: null,
    });
    expect(a).toBe(b);
  });
});
