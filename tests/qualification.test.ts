import { describe, expect, it } from "vitest";
import { walkPathways, type PathwayNode } from "@/lib/qualification";
import {
  QualificationRuleSchema,
  SeriesSchema,
  type QualificationRule,
  type Series,
} from "@/lib/schemas";
import rulesJson from "@/data/seed/qualification_rules.json";
import seriesJson from "@/data/seed/series.json";
import competitionsJson from "@/data/seed/competitions.json";

/**
 * The engine is tested against the real seed data — the same rules the demo
 * runs on — so a seed regression breaks tests, not just the UI.
 */

const rules: QualificationRule[] = rulesJson.map((r) => QualificationRuleSchema.parse(r));
const series: Series[] = seriesJson.map((s) => SeriesSchema.parse(s));
const seriesById = new Map(series.map((s) => [s.id, s]));

const byName = (name: string) => {
  const s = series.find((x) => x.name === name);
  if (!s) throw new Error(`series not in seed: ${name}`);
  return s;
};

const TX_STATE = byName("Texas Scholastic Championship");
const NT_REGIONAL = byName("North Texas Scholastic Regional");
const DENKER = byName("Denker Tournament of High School Champions");
const US_JUNIOR = byName("U.S. Junior Championship");

const flatten = (nodes: PathwayNode[]): PathwayNode[] =>
  nodes.flatMap((n) => [n, ...flatten(n.children)]);

describe("walkPathways", () => {
  it("winning a state championship unlocks all four national invitationals", () => {
    const result = walkPathways({ series_id: TX_STATE.id, placement: 1 }, rules, seriesById);
    const names = result.map((n) => n.to_series.name).sort();
    expect(names).toEqual([
      "Barber Tournament of K-8 Champions",
      "Denker Tournament of High School Champions",
      "Haring Tournament of Girls State Champions",
      "Rockefeller Tournament of K-5 Champions",
    ]);
  });

  it("is placement-sensitive: 3rd at a state championship unlocks nothing", () => {
    const result = walkPathways({ series_id: TX_STATE.id, placement: 3 }, rules, seriesById);
    expect(result).toEqual([]);
  });

  it("is placement-sensitive the other way: 3rd at the regional still qualifies (top-3 rule)", () => {
    const result = walkPathways({ series_id: NT_REGIONAL.id, placement: 3 }, rules, seriesById);
    expect(result.map((n) => n.to_series.name)).toEqual(["Texas Scholastic Championship"]);
  });

  it("'participated' (placement 99) never unlocks anything in the seed graph", () => {
    for (const s of series) {
      expect(walkPathways({ series_id: s.id, placement: 99 }, rules, seriesById)).toEqual([]);
    }
  });

  it("follows the full 3-hop chain: regional → state → Denker → U.S. Junior", () => {
    const result = walkPathways({ series_id: NT_REGIONAL.id, placement: 1 }, rules, seriesById);

    const state = result.find((n) => n.to_series.id === TX_STATE.id);
    expect(state).toBeDefined();
    expect(state!.depth).toBe(1);

    const denker = state!.children.find((n) => n.to_series.id === DENKER.id);
    expect(denker).toBeDefined();
    expect(denker!.depth).toBe(2);

    const junior = denker!.children.find((n) => n.to_series.id === US_JUNIOR.id);
    expect(junior).toBeDefined();
    expect(junior!.depth).toBe(3);
  });

  it("caps recursion at maxDepth edges", () => {
    const result = walkPathways(
      { series_id: NT_REGIONAL.id, placement: 1 },
      rules,
      seriesById,
      2
    );
    const all = flatten(result);
    expect(Math.max(...all.map((n) => n.depth))).toBe(2);
    expect(all.some((n) => n.to_series.id === US_JUNIOR.id)).toBe(false);
  });

  it("supports rules keyed on a single competition (from_competition_id)", () => {
    const loneStar = competitionsJson.find(
      (c) => c.slug === "lone-star-open-scholastic-2026"
    )!;
    const result = walkPathways(
      { competition_id: loneStar.id, series_id: null, placement: 2 },
      rules,
      seriesById
    );
    expect(result.map((n) => n.to_series.name)).toEqual(["Texas Scholastic Championship"]);
    // Deeper hops still expand from the unlocked series.
    expect(result[0].children.some((n) => n.to_series.id === DENKER.id)).toBe(true);
  });

  it("survives cycles in the rules graph without infinite recursion", () => {
    const a: Series = { id: "00000000-0000-4000-8000-00000000aaaa", name: "A", level: "local" };
    const b: Series = { id: "00000000-0000-4000-8000-00000000bbbb", name: "B", level: "state" };
    const cyclic: QualificationRule[] = [
      {
        id: "00000000-0000-4000-8000-00000000ab01",
        from_series_id: a.id,
        from_competition_id: null,
        required_placement: 1,
        to_series_id: b.id,
        notes: "test",
        verified_on: "2026-01-01",
      },
      {
        id: "00000000-0000-4000-8000-00000000ba01",
        from_series_id: b.id,
        from_competition_id: null,
        required_placement: 1,
        to_series_id: a.id,
        notes: "test",
        verified_on: "2026-01-01",
      },
    ];
    const lookup = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const result = walkPathways({ series_id: a.id, placement: 1 }, cyclic, lookup, 10);
    expect(result).toHaveLength(1);
    expect(result[0].to_series.id).toBe(b.id);
    // The edge back to A is suppressed by the visited set.
    expect(result[0].children).toEqual([]);
  });

  it("ignores rules whose target series is missing rather than crashing", () => {
    const dangling: QualificationRule[] = [
      {
        id: "00000000-0000-4000-8000-00000000dd01",
        from_series_id: TX_STATE.id,
        from_competition_id: null,
        required_placement: 1,
        to_series_id: "00000000-0000-4000-8000-00000000dead",
        notes: "test",
        verified_on: "2026-01-01",
      },
    ];
    const result = walkPathways(
      { series_id: TX_STATE.id, placement: 1 },
      dangling,
      seriesById
    );
    expect(result).toEqual([]);
  });
});
