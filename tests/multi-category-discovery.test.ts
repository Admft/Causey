import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTabroomHtml } from "@/ingestion/parse-tabroom";
import { parseVexEventsHtml } from "@/ingestion/parse-vex-events";
import { parseTaeaVaseHtml } from "@/ingestion/parse-taea-vase";
import {
  benningtonGenres,
  parseBenningtonWritersHtml,
} from "@/ingestion/parse-bennington-writers";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { eventFingerprint } from "@/ingestion/fingerprint";
import { buildCompetitionResult } from "@/lib/data/search";
import { SearchFiltersSchema } from "@/lib/schemas";

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "ingestion", "fixtures", name),
    "utf8"
  );
}

describe("official multi-category source adapters", () => {
  it("parses Tabroom dates, registration deadline, and debate formats", () => {
    const [event] = parseTabroomHtml(fixture("tabroom-public-snippet.html"));
    expect(event).toMatchObject({
      externalKey: "37010",
      startDate: "2026-08-27",
      endDate: "2026-08-29",
      regDeadline: "2026-08-24",
      city: "Plano",
      state: "TX",
    });
    expect(event.facets).toEqual(
      expect.arrayContaining([
        "public_forum",
        "lincoln_douglas",
        "policy",
        "speech",
        "world_schools",
      ])
    );
  });

  it("parses VEX identity and keeps canceled availability", () => {
    const [event] = parseVexEventsHtml(
      fixture("vex-events-public-snippet.html")
    );
    expect(event).toMatchObject({
      externalKey: "RE-V5RC-26-4438",
      startDate: "2026-08-29",
      regDeadline: "2026-08-24",
      availability: "canceled",
      entryFeeCents: 15500,
      facets: ["robotics"],
    });
  });

  it("parses the year-specific TAEA State VASE date and location", () => {
    const [event] = parseTaeaVaseHtml(
      fixture("taea-vase-public-snippet.html"),
      "https://www.taea.org/vase/state-overview.asp"
    );
    expect(event).toMatchObject({
      startDate: "2026-04-24",
      endDate: "2026-04-25",
      city: "San Marcos",
      state: "TX",
      zip: "78666",
      facets: ["visual_arts"],
    });
  });

  it("keeps TAEA regional dates as location-incomplete draft inputs", () => {
    const events = parseTaeaVaseHtml(
      fixture("taea-vase-directors-public-snippet.html")
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      name: "HSVASE Region 4W",
      startDate: "2026-02-14",
      state: "TX",
      city: null,
      facets: ["visual_arts"],
    });
    const competition = normalizeCategorySourceEvent(events[0], {
      id: "33333333-3333-4333-8333-333333333333",
      source: "taea_vase_scrape",
    });
    expect(competition?.status).toBe("draft");
  });

  it("extracts Bennington genres but refuses to invent an undated cycle", () => {
    const html = fixture("bennington-writers-public-snippet.html");
    expect(benningtonGenres(html)).toEqual(
      expect.arrayContaining(["fiction", "nonfiction", "poetry"])
    );
    expect(parseBenningtonWritersHtml(html)).toEqual([]);
  });

  it("normalizes facets into details and archives canceled source rows", () => {
    const [raw] = parseVexEventsHtml(
      fixture("vex-events-public-snippet.html")
    );
    const competition = normalizeCategorySourceEvent(raw, {
      id: "11111111-1111-4111-8111-111111111111",
      source: "vex_events_scrape",
      coords: { lat: 29.72, lng: -95.35 },
      resolvedZip: "77087",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "vex_events_scrape",
      status: "archived",
      rating_system: null,
    });
    expect(competition?.details.facets).toEqual(["robotics"]);
  });
});

describe("category facet isolation", () => {
  const competition = normalizeCategorySourceEvent(
    {
      externalKey: "RE-V5RC-26-9999",
      name: "Robotics qualifier",
      detailUrl:
        "https://events.vex.com/robot-competitions/vex-robotics-competition/RE-V5RC-26-9999.html",
      startDate: "2026-10-01",
      endDate: null,
      regDeadline: null,
      participationMode: "online",
      venueName: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      facets: ["robotics"],
      eventType: "Open Tournament",
      availability: "registration open",
      entryFeeCents: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      source: "vex_events_scrape",
    }
  )!;

  it("matches only the requested category and normalized facet", () => {
    expect(
      buildCompetitionResult({
        competition,
        sections: [],
        series: null,
        distance_miles: null,
        filters: SearchFiltersSchema.parse({
          category: "stem",
          facet: "robotics",
          timing: "all",
        }),
      })
    ).not.toBeNull();
    expect(
      buildCompetitionResult({
        competition,
        sections: [],
        series: null,
        distance_miles: null,
        filters: SearchFiltersSchema.parse({
          category: "arts",
          facet: "visual_arts",
          timing: "all",
        }),
      })
    ).toBeNull();
  });

  it("rejects facets from another category", () => {
    expect(
      SearchFiltersSchema.safeParse({
        category: "stem",
        facet: "poetry",
      }).success
    ).toBe(false);
    expect(
      SearchFiltersSchema.safeParse({
        category: "writing",
        featured: "1",
      }).success
    ).toBe(false);
  });

  it("scopes non-chess fingerprints without changing chess identity", () => {
    const base = {
      name: "State Championship",
      start_date: "2026-10-01",
      state: "TX",
      zip: "75001",
    };
    expect(eventFingerprint({ ...base, category: "stem" })).not.toBe(
      eventFingerprint({ ...base, category: "arts" })
    );
    expect(eventFingerprint({ ...base, category: "chess" })).toBe(
      eventFingerprint(base)
    );
  });

  it("widens every ingestion source boundary in migration 0047", () => {
    const migration = fixture(
      "../../supabase/migrations/0047_multi_category_discovery_sources.sql"
    );
    for (const source of [
      "tabroom_scrape",
      "vex_events_scrape",
      "taea_vase_scrape",
      "bennington_writers_scrape",
    ]) {
      expect(migration).toContain(source);
    }
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("ingestion_sources_category_check");
  });
});
