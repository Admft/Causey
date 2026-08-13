import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { parsePurpleCometHtml } from "@/ingestion/parse-purple-comet";

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "ingestion", "fixtures", name),
    "utf8"
  );
}

describe("Purple Comet official source adapter", () => {
  it("requires matching official date and online eligibility evidence", () => {
    const html = fixture("purple-comet-public-snippet.html");
    const [event] = parsePurpleCometHtml(html, html);
    expect(event).toMatchObject({
      externalKey: "purple-comet-2027",
      name: "2027 Purple Comet! Math Meet",
      startDate: "2027-04-06",
      endDate: "2027-04-15",
      participationMode: "online",
      registrationUrl: null,
      city: null,
      state: null,
      facets: ["mathematics"],
      entryFeeCents: 0,
    });
    expect(parsePurpleCometHtml(html, "<main>Rules pending</main>")).toEqual([]);
    expect(
      parsePurpleCometHtml(
        html.replace("Thursday, 15 April 2027", "Date pending"),
        html
      )
    ).toEqual([]);
  });

  it("publishes the online event without invented location or registration", () => {
    const html = fixture("purple-comet-public-snippet.html");
    const [raw] = parsePurpleCometHtml(html, html);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "77777777-7777-4777-8777-777777777777",
      source: "purple_comet_scrape",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "purple_comet_scrape",
      status: "published",
      participation_mode: "online",
      city: null,
      state: null,
      zip: null,
      reg_url: null,
      entry_fee_cents: 0,
    });
    expect(competition?.details).toMatchObject({
      facets: ["mathematics"],
      source_availability:
        "official contest window published; adult supervisor and team registration required",
    });
  });

  it("adds Purple Comet to every source boundary in migration 0053", () => {
    const migration = fixture(
      "../../supabase/migrations/0053_purple_comet_source.sql"
    );
    expect(migration).toContain("purple_comet_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'stem'");
  });
});
