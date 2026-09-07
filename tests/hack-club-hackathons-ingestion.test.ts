import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { parseHackClubHackathonsJson } from "@/ingestion/parse-hack-club-hackathons";

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "ingestion", "fixtures", name),
    "utf8"
  );
}

describe("Hack Club Hackathons official source adapter", () => {
  it("keeps virtual and US rows and drops unpublished and international in-person listings", () => {
    const events = parseHackClubHackathonsJson(
      fixture("hack-club-hackathons-public-snippet.json")
    );
    expect(events.map((event) => event.externalKey)).toEqual([
      "virt-fixture",
      "pa-fixture",
    ]);
    expect(events[0]).toMatchObject({
      name: "Fixture Virtual High School Hack",
      startDate: "2026-11-08",
      endDate: "2026-11-09",
      participationMode: "online",
      city: null,
      state: null,
      facets: ["computer_science"],
      registrationUrl: "https://example.invalid/virtual-hack",
    });
    expect(events[1]).toMatchObject({
      city: "State College",
      state: "PA",
      participationMode: "in_person",
    });
    expect(parseHackClubHackathonsJson("{not json")).toEqual([]);
    expect(parseHackClubHackathonsJson("[]")).toEqual([]);
  });

  it("publishes a virtual listing without a ZIP and never stores logos", () => {
    const [raw] = parseHackClubHackathonsJson(
      fixture("hack-club-hackathons-public-snippet.json")
    );
    const competition = normalizeCategorySourceEvent(raw, {
      id: "88888888-8888-4888-8888-888888888881",
      source: "hack_club_hackathons_scrape",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "hack_club_hackathons_scrape",
      status: "published",
      participation_mode: "online",
      image_url: null,
      city: null,
      zip: null,
    });
    expect(JSON.stringify(competition)).not.toContain("banner");
    expect(JSON.stringify(competition)).not.toContain("logo");
    expect(competition?.details).toMatchObject({
      facets: ["computer_science"],
    });
    expect(String(competition?.details.source_availability)).toContain(
      "Hack Club Hackathons"
    );
  });

  it("adds Hack Club Hackathons to every source boundary in migration 0085", () => {
    const migration = fixture(
      "../../supabase/migrations/0085_hack_club_hackathons_source.sql"
    );
    expect(migration).toContain("hack_club_hackathons_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'stem'");
    expect(migration).not.toContain("record_admin_scraper_dispatch");
  });

  it("audits Hack Club Hackathons in the dispatch-only migration 0086", () => {
    const migration = fixture(
      "../../supabase/migrations/0086_hack_club_hackathons_dispatch.sql"
    );
    expect(migration).toContain("record_admin_scraper_dispatch");
    expect(migration).toContain("'hack_club_hackathons_scrape'");
    expect(migration).toContain("'congressional_app_challenge_scrape'");
    expect(migration).not.toContain("'tabroom_scrape'");
    expect(migration).not.toContain("'vex_events_scrape'");
  });
});
