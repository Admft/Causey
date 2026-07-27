import { describe, expect, it } from "vitest";
import { eventStanding, isFeaturedStanding } from "../lib/event-standing";

describe("eventStanding", () => {
  it("uses curated series level when present", () => {
    const s = eventStanding({
      name: "Anything",
      source: "manual",
      series: { name: "Denker", level: "national" },
    });
    expect(s.id).toBe("national");
    expect(s.label).toBe("National");
    expect(isFeaturedStanding(s)).toBe(true);
  });

  it("marks World Open as major open and featured", () => {
    const s = eventStanding({
      name: "World Open 2026",
      source: "cca_scrape",
      series: null,
    });
    expect(s.id).toBe("major_open");
    expect(isFeaturedStanding(s)).toBe(true);
  });

  it("defaults weekend swiss to local / open without award", () => {
    const s = eventStanding({
      name: "Austin Weekend Swiss G/45",
      source: "tla_scrape",
      series: null,
    });
    expect(s.id).toBe("local");
    expect(s.label).toMatch(/Local/i);
    expect(isFeaturedStanding(s)).toBe(false);
  });

  it("detects state championships from the name without award", () => {
    const s = eventStanding({
      name: "Ohio State Scholastic Championship",
      source: "tla_scrape",
      series: null,
    });
    expect(s.id).toBe("state");
    expect(isFeaturedStanding(s)).toBe(false);
  });

  it("does not feature every CCA open — only named majors", () => {
    const s = eventStanding({
      name: "Atlantic Open",
      source: "cca_scrape",
      series: null,
    });
    expect(s.id).toBe("local");
    expect(isFeaturedStanding(s)).toBe(false);
  });
});
