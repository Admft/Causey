import { describe, expect, it } from "vitest";
import { sectionMatchesFilters } from "@/lib/data/filtering";
import type { Competition, SearchFilters, Section } from "@/lib/schemas";

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    competition_id: "00000000-0000-0000-0000-000000000002",
    name: "Open",
    min_rating: null,
    max_rating: null,
    min_grade: null,
    max_grade: null,
    min_age: null,
    max_age: null,
    gender_restriction: null,
    residency_state: null,
    entry_fee_cents: null,
    ...overrides,
  };
}

const competition = { entry_fee_cents: null } as Competition;
const k3 = { grade_band: "k3", timing: "upcoming" } as SearchFilters;
const hs = { grade_band: "hs", timing: "upcoming" } as SearchFilters;

describe("sectionMatchesFilters grade band vs age limits", () => {
  it("an adults-only section (min_age 18, no grades) does NOT match K–3", () => {
    expect(
      sectionMatchesFilters(makeSection({ min_age: 18 }), competition, k3)
    ).toBe(false);
  });

  it("an adults-only section still matches high school (18-year-old seniors)", () => {
    expect(
      sectionMatchesFilters(makeSection({ min_age: 18 }), competition, hs)
    ).toBe(true);
  });

  it("a fully open section (no limits at all) matches every band", () => {
    expect(sectionMatchesFilters(makeSection(), competition, k3)).toBe(true);
    expect(sectionMatchesFilters(makeSection(), competition, hs)).toBe(true);
  });

  it("grade-restricted sections still filter by grade", () => {
    const primary = makeSection({ min_grade: 0, max_grade: 3 });
    expect(sectionMatchesFilters(primary, competition, k3)).toBe(true);
    expect(sectionMatchesFilters(primary, competition, hs)).toBe(false);
  });

  it("an under-8 age cap does not match high school", () => {
    expect(
      sectionMatchesFilters(makeSection({ max_age: 8 }), competition, hs)
    ).toBe(false);
    expect(
      sectionMatchesFilters(makeSection({ max_age: 8 }), competition, k3)
    ).toBe(true);
  });
});
