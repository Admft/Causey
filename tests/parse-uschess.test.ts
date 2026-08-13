import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { normalizeRawTla } from "@/ingestion/normalize";
import {
  findOrganizerEventUrlInSitemap,
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

  it("extracts a stable Drupal node id when the detail page exposes one", () => {
    const detail = parseDetailHtml(
      `<article data-history-node-id="48291"><div class="views-field-body"><div class="field-content">Event</div></div></article>`,
      "https://new.uschess.org/changeable-event-title"
    );
    expect(detail.sourceExternalKey).toBe("uschess-node:48291");
  });

  it("reads pager max page from the fixture", () => {
    expect(maxPagerPage(load(fixture))).toBeGreaterThanOrEqual(1);
  });

  it("tags normalized rows with tla_scrape provenance", () => {
    const raw = parseListingHtml(fixture)[0]!;
    expect(raw.externalKey).toMatch(/^uschess:/);
    const row = normalizeRawTla(raw, { id: "00000000-0000-4000-8000-000000000001" });
    expect(row?.competition.source).toBe("tla_scrape");
    expect(row?.competition.source_url).toBe(raw.detailUrl);
    expect(row?.competition.slug).toBe("charlotte-chess-center-tuesday-night-action");
    expect(row?.competition.status).toBe("draft"); // no zip/coords yet
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
      registrationUrl: null,
      imageUrl: null,
    });
    const raw = parseListingHtml(fixture)[0]!;
    const normalized = normalizeRawTla(raw, {
      id: "00000000-0000-4000-8000-000000000002",
      detail,
      coords: { lat: 32.9, lng: -96.9 },
    });
    expect(normalized?.competition.reg_url).toBe(raw.detailUrl);

    const genericRegistration = normalizeRawTla(raw, {
      id: "00000000-0000-4000-8000-000000000003",
      detail: {
        ...detail,
        registrationUrl: "https://onlineregistration.cc/",
      },
      coords: { lat: 32.9, lng: -96.9 },
    });
    expect(genericRegistration?.competition.reg_url).toBe(raw.detailUrl);
  });

  it("prefers a labeled event registration link from the detail body", () => {
    const html = `
      <div class="views-field views-field-body">
        <div class="field-content">
          <a href="https://www.texaschesscenter.com/store/p/halloween-championship">
            Register online
          </a>
        </div>
      </div>
      <div class="views-field views-field-field-organizer-website">
        <span class="field-content">
          <a href="https://www.texaschesscenter.com/">Organizer website</a>
        </span>
      </div>
    `;
    const detail = parseDetailHtml(
      html,
      "https://new.uschess.org/halloween-championship"
    );
    expect(detail.registrationUrl).toBe(
      "https://www.texaschesscenter.com/store/p/halloween-championship"
    );
  });

  it("finds the exact organizer event page in a Squarespace sitemap", () => {
    const xml = `
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc>https://www.texaschesscenter.com/</loc>
        </url>
        <url>
          <loc>https://www.texaschesscenter.com/store/p/halloween-championship</loc>
          <image:image>
            <image:title>Store - Halloween Championship</image:title>
          </image:image>
        </url>
      </urlset>
    `;
    expect(
      findOrganizerEventUrlInSitemap(
        xml,
        "Halloween Championship",
        "https://www.texaschesscenter.com/"
      )
    ).toBe(
      "https://www.texaschesscenter.com/store/p/halloween-championship"
    );
  });

  it("uses the event year to select a year-suffixed organizer page", () => {
    const xml = `
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://www.texaschesscenter.com/store/p/texas-fall-championship-2025</loc>
          <image:title>Store - Texas Fall Championship 2025</image:title>
        </url>
        <url>
          <loc>https://www.texaschesscenter.com/store/p/texas-fall-championship-2026</loc>
          <image:title>Store - Texas Fall Championship 2026</image:title>
        </url>
      </urlset>
    `;
    expect(
      findOrganizerEventUrlInSitemap(
        xml,
        "Texas Fall Championship",
        "https://www.texaschesscenter.com/",
        "2026-11-21"
      )
    ).toBe(
      "https://www.texaschesscenter.com/store/p/texas-fall-championship-2026"
    );
  });

  it("extracts og:image when present on the detail page", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.example.com/events/houston-open.jpg" />
      </head><body>
        <div class="views-field views-field-field-event-address">
          <p class="address"><span class="postal-code">77002</span></p>
        </div>
      </body></html>
    `;
    const detail = parseDetailHtml(html, "https://new.uschess.org/houston-open");
    expect(detail.imageUrl).toBe("https://cdn.example.com/events/houston-open.jpg");
  });
});
