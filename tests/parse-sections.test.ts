import { describe, expect, it } from "vitest";
import {
  parseEntryFeeCents,
  parseEventTextExtras,
  parseSectionsFromText,
} from "../ingestion/parse-sections";

const IRVING = `
There are three sections, into which entrants are automatically placed
(based on their latest Monthly US Chess rating):
Championship
U1000
U600
Players whose Monthly ratings are within 150 points of the section cap may,
for a $10 fee, request to play up one section.
`;

const SOUTHERN = `
In 5 sections, top 2 sections FIDE rated.
Major Section: $2000-1200. FIDE rated.
Under 2100 Section: $1600-800, top Under 1900/Unrated $600.
Under 1800 Section: $1400-700.
Under 1500 Section: $1200-600.
Under 1200 Section: $800-400.
Top 4 sections entry fee: $128 online at chessaction.com by 7/14, $150 later.
Under 1200 section entry fee: $40 less.
`;

describe("parseSectionsFromText", () => {
  it("extracts Irving Championship / U1000 / U600", () => {
    const sections = parseSectionsFromText(IRVING);
    const names = sections.map((s) => s.name).sort();
    expect(names).toContain("Championship");
    expect(names).toContain("U1000");
    expect(names).toContain("U600");
    expect(sections.find((s) => s.name === "U1000")?.max_rating).toBe(999);
    expect(sections.find((s) => s.name === "U600")?.max_rating).toBe(599);
  });

  it("extracts CCA Under / Major sections", () => {
    const sections = parseSectionsFromText(SOUTHERN);
    expect(sections.some((s) => s.name === "Major")).toBe(true);
    expect(sections.some((s) => s.name === "U2100")).toBe(true);
    expect(sections.some((s) => s.name === "U1200")).toBe(true);
    expect(sections.find((s) => s.name === "U2100")?.max_rating).toBe(2099);
  });

  it("parses grade bands", () => {
    const sections = parseSectionsFromText("Sections: K-3, Grades 4-6, and K-12 Open");
    expect(sections.some((s) => s.min_grade === 0 && s.max_grade === 3)).toBe(true);
    expect(sections.some((s) => s.min_grade === 4 && s.max_grade === 6)).toBe(true);
  });
});

describe("parseEntryFeeCents", () => {
  it("finds dollar entry fees", () => {
    expect(parseEntryFeeCents("Entry fee: $10 Vision House")).toBe(1000);
    expect(parseEntryFeeCents("EF: $6 for visiting players")).toBe(600);
    expect(parseEntryFeeCents(SOUTHERN)).toBe(12800);
  });

  it("detects free events", () => {
    expect(
      parseEntryFeeCents("completely free for CCC members. This is a great way")
    ).toBe(0);
    expect(parseEntryFeeCents("This is a FREE semi-casual weekly event")).toBe(0);
  });

  it("returns null when fee is unknown", () => {
    expect(parseEntryFeeCents("Four rounds Swiss, G/30;d5 at the club")).toBeNull();
  });
});

describe("parseEventTextExtras", () => {
  it("bundles sections + fee", () => {
    const extras = parseEventTextExtras(IRVING);
    expect(extras.sections.length).toBeGreaterThanOrEqual(2);
    expect(extras.rated).toBe(true);
  });
});
