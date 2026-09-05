import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const rules: QualificationRule[] = rulesJson.map((r) =>
  QualificationRuleSchema.parse(r)
);
const series: Series[] = seriesJson.map((s) => SeriesSchema.parse(s));
const seriesById = new Map(series.map((s) => [s.id, s]));

describe("EventPathways", () => {
  const source = read("mobile/src/EventPathways.tsx");

  it("contains the honest empty copy and does not claim official rulings", () => {
    expect(source).toContain(
      "No qualification pathway in our data. Most events are open entry."
    );
    expect(source).not.toMatch(/official US Chess ruling/i);
    expect(source).toMatch(/We are not sure whether this event feeds a qualifier/);
    expect(source).toMatch(/Check the organizer/);
  });

  it("lists hops from walkPathways PathwayNode JSON, not invented chains", () => {
    const regional = series.find(
      (row) => row.name === "North Texas Scholastic Regional"
    );
    expect(regional).toBeDefined();
    const unlocks = walkPathways(
      { series_id: regional!.id, placement: 1 },
      rules,
      seriesById
    );
    expect(unlocks.length).toBeGreaterThan(0);

    // Same shape GET /api/competitions/[slug] JSON.stringifies.
    const payload = JSON.parse(JSON.stringify(unlocks)) as PathwayNode[];
    const hop = payload[0];
    expect(hop).toEqual(
      expect.objectContaining({
        required_placement: expect.any(Number),
        depth: expect.any(Number),
        children: expect.any(Array),
        to_series: expect.objectContaining({
          name: expect.any(String),
          level: expect.any(String),
        }),
        rule: expect.objectContaining({
          notes: expect.any(String),
          verified_on: expect.any(String),
          required_placement: expect.any(Number),
        }),
      })
    );

    expect(source).toContain("to_series");
    expect(source).toContain("required_placement");
    expect(source).toContain("children");
    expect(source).toContain("Invited to the");
    expect(source).toContain("Then ");
    expect(source).toContain("rule last reviewed");
    expect(source).toContain("seeded and incomplete");
  });

  it("is mounted on the tournament screen with unlocks from the listing API", () => {
    const event = read("mobile/app/event/[slug].tsx");
    expect(event).toContain("EventPathways");
    expect(event).toContain("unlocks={unlocks}");
    expect(event).toContain("pathwayStatus={event.pathway_status}");
    expect(event).toContain("pathwaySummary={event.pathway_summary}");
    expect(event).toContain("data.unlocks");
  });

  it("is also reachable from Search as a Chess Pathways tool", () => {
    const search = read("mobile/app/(tabs)/search.tsx");
    expect(search).toContain('label: "Pathways"');
    expect(search).toContain("PathwayExplorer");
    expect(search).toContain("ChessNationalsPin");
    expect(search).toContain('setTool("pathways")');
  });
});
