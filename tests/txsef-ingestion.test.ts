import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { parseTxsefHtml } from "@/ingestion/parse-txsef";

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "ingestion", "fixtures", name),
    "utf8"
  );
}

describe("TXSEF official source adapter", () => {
  it("requires exact state-fair, location, qualification, and grade evidence", () => {
    const html = fixture("txsef-public-snippet.html");
    const [event] = parseTxsefHtml(html, html);
    expect(event).toMatchObject({
      externalKey: "txsef-2027",
      name: "2027 Texas Science and Engineering Fair",
      startDate: "2027-04-02",
      endDate: "2027-04-03",
      participationMode: "in_person",
      venueName: "Texas A&M University Student Recreation Center",
      city: "College Station",
      state: "TX",
      zip: null,
      registrationUrl: null,
      facets: ["science_fair"],
      entryFeeCents: null,
    });
    expect(parseTxsefHtml(html, "<main>Eligibility pending</main>")).toEqual([]);
    expect(
      parseTxsefHtml(
        html.replace("April 2–3, 2027", "Dates pending"),
        html
      )
    ).toEqual([]);
  });

  it("publishes only with resolved official city geography", () => {
    const html = fixture("txsef-public-snippet.html");
    const [raw] = parseTxsefHtml(html, html);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "55555555-5555-4555-8555-555555555555",
      source: "txsef_scrape",
      coords: { lat: 30.6279, lng: -96.3344 },
      resolvedZip: "77840",
      geoPrecision: "city",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "txsef_scrape",
      status: "published",
      participation_mode: "in_person",
      city: "College Station",
      state: "TX",
      zip: "77840",
      reg_url: null,
      entry_fee_cents: null,
      pathway_status: "none",
    });
    expect(competition?.details).toMatchObject({
      facets: ["science_fair"],
      geo_precision: "city",
      source_availability:
        "official state fair dates published; regional qualification required",
    });
  });

  it("adds TXSEF to every source boundary in migration 0055", () => {
    const migration = fixture(
      "../../supabase/migrations/0055_txsef_source.sql"
    );
    expect(migration).toContain("txsef_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'stem'");
  });
});
