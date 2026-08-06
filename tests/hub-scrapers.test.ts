import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeRawFide, parseFideDateRange, parseFideLocation } from "@/ingestion/normalize-fide";
import { parseFideCalendarHtml } from "@/ingestion/parse-fide";
import {
  chessResultsStandingHint,
  normalizeRawChessResults,
  parseChessResultsLocation,
} from "@/ingestion/normalize-chess-results";
import { parseChessResultsSearchHtml } from "@/ingestion/parse-chess-results";
import {
  cleanOnlineRegName,
  normalizeRawOnlineReg,
  onlineRegStandingHint,
} from "@/ingestion/normalize-onlinereg";
import { parseOnlineRegIndexHtml } from "@/ingestion/parse-onlinereg";

const fideHtml = readFileSync(
  join(process.cwd(), "ingestion/fixtures/fide-calendar-tiles.html"),
  "utf8"
);
const crHtml = readFileSync(
  join(process.cwd(), "ingestion/fixtures/chess-results-usa-search.html"),
  "utf8"
);
const orHtml = readFileSync(
  join(process.cwd(), "ingestion/fixtures/onlinereg-tournaments-index.html"),
  "utf8"
);

describe("FIDE calendar parser", () => {
  it("parses tiles with catalog classes from the fixture", () => {
    const rows = parseFideCalendarHtml(fideHtml);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some((r) => r.catalogClass === "world_fide" || r.catalogClass === "world_top")).toBe(
      true
    );
    expect(rows[0]!.externalKey).toMatch(/^\d+$/);
    expect(rows[0]!.detailUrl).toContain("calendar.fide.com");
  });

  it("splits glued date + location headers", () => {
    const dates = parseFideDateRange("29 Jul-28 Aug");
    expect(dates?.start).toMatch(/^\d{4}-07-29$/);
    expect(dates?.end).toMatch(/^\d{4}-08-28$/);
  });

  it("parses US location into city/state", () => {
    const loc = parseFideLocation("Saint Louis, Missouri, USA");
    expect(loc.state).toBe("MO");
    expect(loc.city).toMatch(/Saint Louis/i);
  });

  it("tags normalized rows with fide_calendar_scrape and catalog details", () => {
    const raw = parseFideCalendarHtml(fideHtml).find((r) => r.name.length > 5)!;
    const row = normalizeRawFide(raw, { id: "00000000-0000-4000-8000-000000000101" });
    expect(row?.source).toBe("fide_calendar_scrape");
    expect(row?.details.catalog_class).toBe(raw.catalogClass);
    expect(row?.status).toBe("draft");
  });
});

describe("Chess-Results parser", () => {
  it("parses USA search rows from the fixture", () => {
    const rows = parseChessResultsSearchHtml(crHtml);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.every((r) => r.externalKey.match(/^\d+$/))).toBe(true);
    expect(rows[0]!.detailUrl).toContain("chess-results.com/tnr");
    expect(rows[0]!.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses city/state locations", () => {
    const loc = parseChessResultsLocation("Houston, TX 77009");
    expect(loc).toMatchObject({ city: "Houston", state: "TX", zip: "77009" });
  });

  it("keeps XX locations as draft without inventing a state", () => {
    const raw = parseChessResultsSearchHtml(crHtml)[0]!;
    const row = normalizeRawChessResults(
      { ...raw, locationText: "Somewhere Abroad", federation: "USA" },
      { id: "00000000-0000-4000-8000-000000000102" }
    );
    expect(row?.state).toBe("XX");
    expect(row?.status).toBe("draft");
    expect(chessResultsStandingHint(raw)).toMatch(/local|solid|major|national|international/);
  });
});

describe("OnlineRegistration parser", () => {
  it("parses tournament index rows from the fixture", () => {
    const rows = parseOnlineRegIndexHtml(orHtml);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0]!.tid.length).toBeGreaterThan(4);
    expect(rows[0]!.regUrl).toContain("tid=");
  });

  it("cleans machine-coded names", () => {
    expect(cleanOnlineRegName("2026-0806_EMCC-THUR-NITE-QUADS")).toMatch(/EMCC/i);
  });

  it("normalizes with onlinereg_scrape provenance when state parses", () => {
    const raw = parseOnlineRegIndexHtml(orHtml).find((r) => r.stateName && r.startText)!;
    const row = normalizeRawOnlineReg(raw, {
      id: "00000000-0000-4000-8000-000000000103",
    });
    expect(row?.source).toBe("onlinereg_scrape");
    expect(row?.details.catalog_standing).toBe(onlineRegStandingHint(raw));
    expect(row?.status).toBe("draft");
  });
});
