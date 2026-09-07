import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeCategorySourceEvent } from "@/ingestion/normalize-category-source";
import { parseCongressionalAppChallengeHtml } from "@/ingestion/parse-congressional-app-challenge";

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "ingestion", "fixtures", name),
    "utf8"
  );
}

describe("Congressional App Challenge official source adapter", () => {
  it("requires a matching national window and middle/high-school eligibility", () => {
    const html = fixture("congressional-app-challenge-public-snippet.html");
    const [event] = parseCongressionalAppChallengeHtml(html, html);
    expect(event).toMatchObject({
      externalKey: "congressional-app-challenge-2026",
      name: "2026 Congressional App Challenge",
      startDate: "2026-05-01",
      endDate: "2026-10-26",
      regDeadline: "2026-10-26",
      dateSemantics: "submission_deadline",
      participationMode: "online",
      registrationUrl: null,
      city: null,
      state: null,
      facets: ["computer_science"],
      entryFeeCents: null,
    });
    expect(parseCongressionalAppChallengeHtml(html, "<main>Rules pending</main>")).toEqual(
      []
    );
    expect(
      parseCongressionalAppChallengeHtml(
        html.replace("May 1 to October 26, 2026", "dates pending"),
        html
      )
    ).toEqual([]);
  });

  it("does not turn a participating-district table into extra rows", () => {
    const districts = `
      <main>
        <p>The 2026 Congressional App Challenge runs from May 1 to October 26, 2026.</p>
        <table>
          <tr><td>AK00 (Nicholas J. Begich)</td><td>CA12 (Lateefah Simon)</td></tr>
        </table>
      </main>
    `;
    const rules = fixture("congressional-app-challenge-public-snippet.html");
    expect(parseCongressionalAppChallengeHtml(districts, rules)).toHaveLength(1);
  });

  it("publishes the online cycle without invented location or registration", () => {
    const html = fixture("congressional-app-challenge-public-snippet.html");
    const [raw] = parseCongressionalAppChallengeHtml(html, html);
    const competition = normalizeCategorySourceEvent(raw, {
      id: "88888888-8888-4888-8888-888888888888",
      source: "congressional_app_challenge_scrape",
    });
    expect(competition).toMatchObject({
      category: "stem",
      source: "congressional_app_challenge_scrape",
      status: "published",
      participation_mode: "online",
      city: null,
      state: null,
      zip: null,
      reg_url: null,
      entry_fee_cents: null,
    });
    expect(competition?.details).toMatchObject({
      facets: ["computer_science"],
      date_semantics: "submission_deadline",
      source_availability:
        "official national submission window published; eligibility is middle or high school students in a participating congressional district",
    });
  });

  it("adds Congressional App Challenge to every source boundary in migration 0083", () => {
    const migration = fixture(
      "../../supabase/migrations/0083_congressional_app_challenge_source.sql"
    );
    expect(migration).toContain("congressional_app_challenge_scrape");
    expect(migration).toContain("competitions_source_check");
    expect(migration).toContain("competition_sources_source_check");
    expect(migration).toContain("scrape_runs_source_check");
    expect(migration).toContain("'stem'");
    expect(migration).not.toContain("record_admin_scraper_dispatch");
  });

  it("audits Congressional App Challenge in the dispatch-only migration 0084", () => {
    const migration = fixture(
      "../../supabase/migrations/0084_congressional_app_challenge_dispatch.sql"
    );
    expect(migration).toContain("record_admin_scraper_dispatch");
    expect(migration).toContain("'congressional_app_challenge_scrape'");
    expect(migration).not.toContain("'tabroom_scrape'");
    expect(migration).not.toContain("'vex_events_scrape'");
  });
});
