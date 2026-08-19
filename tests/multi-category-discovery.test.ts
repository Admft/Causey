import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseTabroomHtml,
  tabroomFacets,
} from "@/ingestion/parse-tabroom";
import { assertTabroomLiveAccessAllowed } from "@/ingestion/scrape-tabroom";
import { parseVexEventsHtml } from "@/ingestion/parse-vex-events";
import { parseTaeaVaseHtml } from "@/ingestion/parse-taea-vase";
import {
  benningtonGenres,
  parseBenningtonWritersHtml,
} from "@/ingestion/parse-bennington-writers";
import { parseDoeScienceBowlHtml } from "@/ingestion/parse-doe-science-bowl";
import { parseAfsaEssayHtml } from "@/ingestion/parse-afsa-essay";
import { parseUilTheatreHtml } from "@/ingestion/parse-uil-theatre";
import { parseUilSpeechDebateHtml } from "@/ingestion/parse-uil-speech-debate";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { eventFingerprint } from "@/ingestion/fingerprint";
import { buildCompetitionResult } from "@/lib/data/search";
import { SearchFiltersSchema, type Competition } from "@/lib/schemas";
import { discoveryCategory } from "@/lib/category-discovery";
import {
  competitionSourceOptionsForCategory,
  isCompetitionSourceFilter,
  sourceByCompetitionSource,
} from "@/lib/ingestion-sources";

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

  it("recognizes current Tabroom division-code variants without guessing", () => {
    expect(
      tabroomFacets("JVPFD LDUIL JVCX CONGL NWSD INFOL PROCH")
    ).toEqual(
      expect.arrayContaining([
        "public_forum",
        "lincoln_douglas",
        "policy",
        "congress",
        "world_schools",
        "speech",
      ])
    );
    expect(tabroomFacets("MATH SCI NumSe CalAp")).toEqual([]);
  });

  it("blocks live Tabroom access until written NSDA permission is recorded", () => {
    expect(() => assertTabroomLiveAccessAllowed({})).toThrow(
      /written NSDA permission/i
    );
    expect(() =>
      assertTabroomLiveAccessAllowed({
        SCRAPE_HTML_FILE: "ingestion/fixtures/tabroom-public-snippet.html",
      })
    ).not.toThrow();
    expect(() =>
      assertTabroomLiveAccessAllowed({
        SCRAPE_HTML_FILE: "ingestion/fixtures/tabroom-public-snippet.html",
        SCRAPE_UPSERT_ONLY: "1",
      })
    ).toThrow(/stage-only/i);
    expect(() =>
      assertTabroomLiveAccessAllowed({ TABROOM_WRITTEN_PERMISSION: "1" })
    ).not.toThrow();
  });

  it("keeps paused Tabroom out of active discovery and source filters", () => {
    expect(sourceByCompetitionSource("tabroom_scrape")?.status).toBe("soon");
    expect(isCompetitionSourceFilter("tabroom_scrape")).toBe(false);
    expect(
      competitionSourceOptionsForCategory("debate").map((source) => source.value)
    ).not.toContain("tabroom_scrape");
    expect(
      discoveryCategory("debate")?.activeSources.map((source) => source.name)
    ).toEqual(["UIL Speech & Debate Invitationals"]);
    expect(
      discoveryCategory("debate")?.referenceSources.map((source) => source.name)
    ).toContain("Tabroom");
  });

  it("parses only explicit UIL speech/debate rows with complete locations", () => {
    const events = parseUilSpeechDebateHtml(
      fixture("uil-speech-debate-public-snippet.html")
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      externalKey: "2026-09-19-lebanon-trail-high-school",
      startDate: "2026-09-19",
      endDate: null,
      city: "Frisco",
      state: "TX",
      zip: "75035",
      registrationUrl: null,
    });
    expect(events[0].facets).toEqual(
      expect.arrayContaining(["lincoln_douglas", "policy", "congress", "speech"])
    );
    expect(events[1]).toMatchObject({
      city: "Olney",
      address: "704 W. Grove",
      zip: "76374",
    });
    expect(events.map((event) => event.name).join(" ")).not.toContain(
      "Texas Tech"
    );
    expect(events.map((event) => event.name).join(" ")).not.toContain(
      "A&M Consolidated"
    );
  });

  it("normalizes UIL speech/debate rows as publishable debate listings", () => {
    const [event] = parseUilSpeechDebateHtml(
      fixture("uil-speech-debate-public-snippet.html")
    );
    const competition = normalizeCategorySourceEvent(event, {
      id: "00000000-0000-4000-8000-000000000052",
      source: "uil_speech_debate_scrape",
      coords: { lat: 33.1507, lng: -96.8236 },
      resolvedZip: event.zip,
    });
    expect(competition).toMatchObject({
      category: "debate",
      status: "published",
      source: "uil_speech_debate_scrape",
      reg_url: null,
    });
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

  it("parses only complete DOE national dates with official city evidence", () => {
    const html = fixture("doe-science-bowl-public-snippet.html");
    const events = parseDoeScienceBowlHtml(html, html);
    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({
      externalKey: "national-2027",
      name: "2027 National Science Bowl National Event",
      startDate: "2027-04-29",
      endDate: "2027-05-03",
      registrationUrl: null,
      city: "Washington",
      state: "DC",
      facets: ["science_bowl", "mathematics"],
    });
    expect(parseDoeScienceBowlHtml(html, "<main>Location pending</main>")).toEqual(
      []
    );
  });

  it("keeps DOE registration empty and publishes only with resolved geography", () => {
    const html = fixture("doe-science-bowl-public-snippet.html");
    const [raw] = parseDoeScienceBowlHtml(html, html);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "44444444-4444-4444-8444-444444444444",
      source: "doe_science_bowl_scrape",
      coords: { lat: 38.9072, lng: -77.0369 },
      resolvedZip: "20001",
      geoPrecision: "city",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "doe_science_bowl_scrape",
      status: "published",
      reg_url: null,
      city: "Washington",
      state: "DC",
    });
    expect(competition?.details.geo_precision).toBe("city");
    expect(competition?.details.location_source_url).toBe(
      "https://science.osti.gov/wdts/nsb/About"
    );
  });

  it("parses AFSA only when the official cycle and deadline agree", () => {
    const html = fixture("afsa-essay-public-snippet.html");
    const [event] = parseAfsaEssayHtml(html, html);
    expect(event).toMatchObject({
      externalKey: "essay-contest-2025-2026",
      name: "2025–2026 AFSA National High School Essay Contest",
      startDate: "2026-03-01",
      endDate: "2026-03-01",
      regDeadline: "2026-03-01",
      registrationUrl: null,
      facets: ["essay"],
      dateSemantics: "submission_deadline",
    });
    expect(
      parseAfsaEssayHtml(
        html,
        html.replace("March 1, 2026", "March 1, 2027")
      )
    ).toEqual([]);
  });

  it("normalizes the closed AFSA deadline as a published ended listing", () => {
    const html = fixture("afsa-essay-public-snippet.html");
    const [raw] = parseAfsaEssayHtml(html, html);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "55555555-5555-4555-8555-555555555555",
      source: "afsa_essay_scrape",
    });
    expect(competition).toMatchObject({
      category: "writing",
      source: "afsa_essay_scrape",
      status: "published",
      participation_mode: "online",
      reg_url: null,
      entry_fee_cents: null,
    });
    expect(competition?.details).toMatchObject({
      facets: ["essay"],
      date_semantics: "submission_deadline",
      deadline_source_url: "https://afsa.org/writers-checklist",
    });
  });

  it("parses only the exact tentative UIL theatre state-meet ranges", () => {
    const html = fixture("uil-theatre-public-snippet.html");
    const events = parseUilTheatreHtml(html);
    expect(events).toHaveLength(3);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          externalKey: "one-act-play-1a-3a-2027",
          startDate: "2027-05-10",
          endDate: "2027-05-12",
          city: "Austin",
          state: "TX",
          facets: ["theatre"],
          registrationUrl: null,
        }),
        expect.objectContaining({
          externalKey: "theatrical-design-2027",
          startDate: "2027-05-14",
          endDate: "2027-05-15",
        }),
        expect.objectContaining({
          externalKey: "one-act-play-4a-6a-2027",
          startDate: "2027-05-17",
          endDate: "2027-05-19",
        }),
      ])
    );
    expect(
      parseUilTheatreHtml(html.replaceAll("Austin, TX", "Location pending"))
    ).toEqual([]);
    expect(parseUilTheatreHtml(html.replace("Tentative", "Confirmed"))).toEqual([]);
  });

  it("publishes UIL theatre only when Austin geography resolves", () => {
    const [raw] = parseUilTheatreHtml(
      fixture("uil-theatre-public-snippet.html")
    );
    const competition = normalizeCategorySourceEvent(raw, {
      id: "66666666-6666-4666-8666-666666666666",
      source: "uil_theatre_scrape",
      coords: { lat: 30.2672, lng: -97.7431 },
      resolvedZip: "78701",
      geoPrecision: "city",
    });
    expect(competition).toMatchObject({
      category: "arts",
      source: "uil_theatre_scrape",
      status: "published",
      reg_url: null,
      city: "Austin",
      state: "TX",
      zip: "78701",
    });
    expect(competition?.details).toMatchObject({
      facets: ["theatre"],
      geo_precision: "city",
      source_availability:
        "tentative state schedule published; participation limited to UIL state qualifiers",
    });
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

  it("matches mathematics to team-math children and never infers biology from a science fair", () => {
    const mathMeet: Competition = {
      ...competition,
      details: {
        ...competition.details,
        facets: ["mathematics", "math_team"],
      },
    };
    const scienceFair: Competition = {
      ...competition,
      details: {
        ...competition.details,
        facets: ["science_fair"],
      },
    };
    const hit = (row: Competition, facet: string) =>
      buildCompetitionResult({
        competition: row,
        sections: [],
        series: null,
        distance_miles: null,
        filters: SearchFiltersSchema.parse({
          category: "stem",
          facet,
          timing: "all",
        }),
      });

    expect(hit(mathMeet, "mathematics")).not.toBeNull();
    expect(hit(mathMeet, "math_team")).not.toBeNull();
    expect(hit(mathMeet, "biology")).toBeNull();
    expect(hit(scienceFair, "science_fair")).not.toBeNull();
    expect(hit(scienceFair, "biology")).toBeNull();
    expect(
      SearchFiltersSchema.safeParse({
        category: "stem",
        facet: "biology",
      }).success
    ).toBe(true);
  });

  it("keeps arts music and theatre on separate filters in one directory", () => {
    const music = normalizeCategorySourceEvent(
      {
        externalKey: "uil-music-test",
        name: "State marching band",
        detailUrl: "https://www.uiltexas.org/music/marching-band/state",
        startDate: "2026-11-03",
        endDate: null,
        regDeadline: null,
        participationMode: "in_person",
        venueName: "Alamodome",
        address: null,
        city: "San Antonio",
        state: "TX",
        zip: "78203",
        facets: ["music"],
        eventType: "State open class marching band",
        availability: "official dates published",
        entryFeeCents: null,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        source: "uil_music_marching_scrape",
        coords: { lat: 29.4169, lng: -98.4789 },
        resolvedZip: "78203",
      }
    )!;
    const theatre = normalizeCategorySourceEvent(
      {
        externalKey: "uil-theatre-test",
        name: "One-Act Play state meet",
        detailUrl: "https://www.uiltexas.org/theatre/state",
        startDate: "2027-05-01",
        endDate: null,
        regDeadline: null,
        participationMode: "in_person",
        venueName: null,
        address: null,
        city: "Austin",
        state: "TX",
        zip: "78701",
        facets: ["theatre"],
        eventType: "State theatre meet",
        availability: "official dates published",
        entryFeeCents: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        source: "uil_theatre_scrape",
        coords: { lat: 30.2672, lng: -97.7431 },
        resolvedZip: "78701",
      }
    )!;
    const artsHit = (row: NonNullable<typeof music>, facet: string) =>
      buildCompetitionResult({
        competition: row,
        sections: [],
        series: null,
        distance_miles: null,
        filters: SearchFiltersSchema.parse({
          category: "arts",
          facet,
          timing: "all",
        }),
      });

    expect(artsHit(music, "music")).not.toBeNull();
    expect(artsHit(music, "theatre")).toBeNull();
    expect(artsHit(theatre, "theatre")).not.toBeNull();
    expect(artsHit(theatre, "music")).toBeNull();
  });

  it("lets organizers persist details.facets through the edit RPC in migration 0059", () => {
    const migration = fixture(
      "../../supabase/migrations/0059_competition_facet_updates.sql"
    );
    expect(migration).toContain("update_competition_with_sections");
    expect(migration).toContain("p_values->'facets'");
    expect(migration).toContain("jsonb_set(");
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

  it("adds DOE Science Bowl to every source boundary in migration 0048", () => {
    const migration = fixture(
      "../../supabase/migrations/0048_doe_science_bowl_source.sql"
    );
    expect(migration).toContain("doe_science_bowl_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'stem'");
  });

  it("adds AFSA essay to every source boundary in migration 0049", () => {
    const migration = fixture(
      "../../supabase/migrations/0049_afsa_essay_source.sql"
    );
    expect(migration).toContain("afsa_essay_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'writing'");
  });

  it("adds UIL theatre to every source boundary in migration 0050", () => {
    const migration = fixture(
      "../../supabase/migrations/0050_uil_theatre_source.sql"
    );
    expect(migration).toContain("uil_theatre_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'arts'");
  });

  it("archives only primary Tabroom rows and preserves provenance in migration 0051", () => {
    const migration = fixture(
      "../../supabase/migrations/0051_pause_tabroom_automation.sql"
    );
    const normalized = migration.replace(/\s+/g, " ");
    expect(migration).toContain("tabroom_scrape");
    expect(migration).toContain("status = 'soon'");
    expect(migration).toContain("written NSDA permission");
    expect(normalized).toContain("update public.competitions set status = 'archived'");
    expect(normalized).toContain("where source = 'tabroom_scrape'");
    expect(migration).toContain("'access_remediation'");
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/\bupdate\s+public\.competition_sources\b/i);
  });

  it("adds UIL speech/debate to every source boundary in migration 0052", () => {
    const migration = fixture(
      "../../supabase/migrations/0052_uil_speech_debate_source.sql"
    );
    expect(migration).toContain("uil_speech_debate_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'debate'");
  });
});
