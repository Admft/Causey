import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { normalizeRawTla } from "@/ingestion/normalize";
import {
  maxPagerPage,
  parseDetailHtml,
  parseListingHtml,
} from "@/ingestion/parse-uschess";

const fixture = readFileSync(
  join(process.cwd(), "ingestion/fixtures/upcoming-tournaments-page0.html"),
  "utf8"
);

describe("US Chess listing parser", () => {
  it("parses event cards from the saved upcoming-tournaments fixture", () => {
    const rows = parseListingHtml(fixture);
    expect(rows.length).toBe(30);
    expect(rows[0]).toMatchObject({
      name: "Charlotte Chess Center Tuesday Night Action",
      state: "NC",
      city: "Charlotte",
    });
    expect(rows[0].detailUrl).toContain("new.uschess.org/");
    expect(rows[0].dateText).toMatch(/2026-07-21/);
  });

  it("reads pager max page from the fixture", () => {
    expect(maxPagerPage(load(fixture))).toBeGreaterThanOrEqual(1);
  });

  it("tags normalized rows with tla_scrape provenance", () => {
    const raw = parseListingHtml(fixture)[0]!;
    const row = normalizeRawTla(raw, { id: "00000000-0000-4000-8000-000000000001" });
    expect(row?.source).toBe("tla_scrape");
    expect(row?.source_url).toBe(raw.detailUrl);
    expect(row?.slug).toBe("charlotte-chess-center-tuesday-night-action");
    expect(row?.status).toBe("draft"); // no zip/coords yet
  });
});

describe("US Chess detail parser", () => {
  it("extracts address, zip, and organizer website from detail HTML", () => {
    const html = `
      <div class="views-field views-field-field-event-location-name">
        <div class="field-content">Texas Chess Center</div>
      </div>
      <div class="views-field views-field-field-event-address">
        <span class="field-content">
          <p class="address">
            <span class="address-line1">4343 West Royal Lane</span>
            <span class="address-line2">STE 114</span>
            <span class="locality">Irving</span>
            <span class="administrative-area">TX</span>
            <span class="postal-code">75063</span>
          </p>
        </span>
      </div>
      <div class="views-field views-field-field-organizer-website">
        <span class="field-content"><a href="https://www.texaschesscenter.com/">site</a></span>
      </div>
      <div class="views-field views-field-field-online-event">
        <span class="field-content">No</span>
      </div>
    `;
    const detail = parseDetailHtml(html);
    expect(detail).toMatchObject({
      venueName: "Texas Chess Center",
      zip: "75063",
      city: "Irving",
      state: "TX",
      online: false,
      organizerWebsite: "https://www.texaschesscenter.com/",
    });
  });
});
