import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { parseUilMusicMarchingHtml } from "@/ingestion/parse-uil-music-marching";

const fixturePath = resolve(
  process.cwd(),
  "ingestion/fixtures/uil-music-marching-public-snippet.html"
);
const fixture = readFileSync(fixturePath, "utf8");

describe("UIL state open-class marching band ingestion", () => {
  it("parses exact state dates, conference groups, and Alamodome location", () => {
    const events = parseUilMusicMarchingHtml(fixture);
    expect(events).toHaveLength(6);
    expect(events[0]).toMatchObject({
      externalKey: "open-class-1a-3a-5a-2026",
      name: "2026 UIL State Open Class Marching Band Contest (1A/3A/5A)",
      startDate: "2026-11-02",
      endDate: "2026-11-04",
      registrationUrl: null,
      regDeadline: null,
      venueName: "Alamodome",
      city: "San Antonio",
      state: "TX",
      facets: ["music"],
      classifications: ["1A", "3A", "5A"],
      entryFeeCents: null,
    });
    expect(events[4]).toMatchObject({
      externalKey: "open-class-1a-3a-5a-2028",
      startDate: "2028-10-30",
      endDate: "2028-11-01",
      classifications: ["1A", "3A", "5A"],
      availability:
        "future state dates and venue published; detailed schedule pending",
    });
  });

  it("fails closed when title, location, or one conference group is missing", () => {
    expect(
      parseUilMusicMarchingHtml(
        fixture.replace(
          "State Open Class Marching Band Contest — Music",
          "Music Calendar"
        )
      )
    ).toEqual([]);
    expect(
      parseUilMusicMarchingHtml(
        fixture.replace("Alamodome: San Antonio", "Site TBD")
      )
    ).toEqual([]);
    expect(
      parseUilMusicMarchingHtml(
        fixture.replace(
          "<p>2026 2A/4A/6A Contests: November 9, 10, 11 Alamodome: San Antonio</p>",
          ""
        )
      )
    ).toEqual([]);
  });

  it("normalizes a resolved row as published without invented registration data", () => {
    const [raw] = parseUilMusicMarchingHtml(fixture);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "77777777-7777-4777-8777-777777777777",
      source: "uil_music_marching_scrape",
      coords: { lat: 29.4167, lng: -98.4788 },
      resolvedZip: "78203",
      geoPrecision: "city",
    });
    expect(competition).toMatchObject({
      category: "arts",
      source: "uil_music_marching_scrape",
      status: "published",
      reg_url: null,
      entry_fee_cents: null,
      venue_name: "Alamodome",
    });
    expect(competition?.details).toMatchObject({
      facets: ["music"],
      classifications: ["1A", "3A", "5A"],
      geo_precision: "city",
    });
  });

  it("adds source boundaries and Arts metadata in migration 0054", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/0054_uil_music_marching_source.sql"
      ),
      "utf8"
    );
    expect(migration).toContain("uil_music_marching_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'arts'");
  });
});
