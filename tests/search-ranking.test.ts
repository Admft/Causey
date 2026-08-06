import { describe, expect, it } from "vitest";
import { sortCompetitionResults } from "@/lib/data/search";
import type { CompetitionResult } from "@/lib/data/types";
import { SearchFiltersSchema, type SearchFilters } from "@/lib/schemas";

function result(
  id: string,
  overrides: Partial<CompetitionResult> = {}
): CompetitionResult {
  return {
    id,
    name: id,
    start_date: "2026-09-01",
    distance_miles: null,
    interest_count: 0,
    ...overrides,
  } as CompetitionResult;
}

describe("search ranking", () => {
  it("makes popular the API default", () => {
    expect(SearchFiltersSchema.parse({}).sort).toBe("popular");
  });

  it("defaults to real user interest before date", () => {
    const results = [
      result("soon", { start_date: "2026-08-10", interest_count: 1 }),
      result("popular", { start_date: "2026-09-10", interest_count: 4 }),
    ];

    sortCompetitionResults(results, { timing: "upcoming", sort: "popular" } as SearchFilters);

    expect(results.map((item) => item.id)).toEqual(["popular", "soon"]);
  });

  it("keeps nearer distance bands ahead of farther popular events", () => {
    const results = [
      result("far-popular", { distance_miles: 31, interest_count: 20 }),
      result("near", { distance_miles: 12, interest_count: 0 }),
      result("near-popular", { distance_miles: 18, interest_count: 2 }),
    ];

    sortCompetitionResults(results, { timing: "upcoming", sort: "popular" } as SearchFilters);

    expect(results.map((item) => item.id)).toEqual([
      "near-popular",
      "near",
      "far-popular",
    ]);
  });

  it("lifts a member's org without burying stronger public interest", () => {
    const orgId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const results = [
      result("popular-public", { interest_count: 4 }),
      result("member-event", { interest_count: 1, org_id: orgId }),
      result("less-popular-public", { interest_count: 2 }),
    ];

    sortCompetitionResults(
      results,
      { timing: "upcoming", sort: "popular" } as SearchFilters,
      new Set([orgId])
    );

    expect(results.map((item) => item.id)).toEqual([
      "popular-public",
      "member-event",
      "less-popular-public",
    ]);
  });

  it("honors the explicit soonest-first option", () => {
    const results = [
      result("popular-later", { start_date: "2026-10-01", interest_count: 10 }),
      result("soon", { start_date: "2026-08-15", interest_count: 0 }),
    ];

    sortCompetitionResults(results, { timing: "upcoming", sort: "soonest" } as SearchFilters);

    expect(results.map((item) => item.id)).toEqual(["soon", "popular-later"]);
  });
});
