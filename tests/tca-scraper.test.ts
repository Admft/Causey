import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeRawTca } from "@/ingestion/normalize-tca";
import {
  parseTcaDateRange,
  parseTcaDetailHtml,
  parseTcaListingHtml,
  parseTcaNextPageUrl,
} from "@/ingestion/parse-tca";
import { preserveExistingImage } from "@/ingestion/persist";

const fixture = readFileSync(
  join(
    process.cwd(),
    "ingestion/fixtures/incoming/TCA and TCA Club Events _ Texas Chess Association.html"
  ),
  "utf8"
);
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0032_tca_scrape_source.sql"),
  "utf8"
);

describe("Texas Chess Association scraper", () => {
  it("parses every tournament card with its picture", () => {
    const rows = parseTcaListingHtml(fixture);
    expect(rows).toHaveLength(21);
    expect(rows.every((row) => row.imageReference)).toBe(true);
    expect(rows.every((row) => row.imageUrl === null)).toBe(true);
    expect(
      rows.find((row) => row.name === "92nd Southwest Open")?.imageReference
    ).toContain(
      "92SWO-627x376.png"
    );
  });

  it("follows the archive pagination link", () => {
    expect(parseTcaNextPageUrl(fixture)).toBe(
      "https://texaschess.org/tca-and-tca-club-events/page/2/"
    );
  });

  it("parses full and ordinal date ranges", () => {
    expect(
      parseTcaDateRange("September 4, 2026 to September 7, 2026")
    ).toMatchObject({ start: "2026-09-04", end: "2026-09-07" });
    expect(
      parseTcaDateRange("September 4, 2026 to September 7, 2026La Quinta")
    ).toMatchObject({ start: "2026-09-04", end: "2026-09-07" });
    expect(parseTcaDateRange("(March 21st, 2026)")).toMatchObject({
      start: "2026-03-21",
    });
  });

  it("extracts detail location, registration, and responsive picture", () => {
    const detail = parseTcaDetailHtml(
      `<html><body><article><div class="entry-content">
        <p>September 4, 2026 to September 7, 2026</p>
        <p>7902 N MacArthur Blvd, Irving, TX 75063</p>
        <a href="https://register.example.com/swo">Registration</a>
        <img src="/tiny-placeholder.png"
             srcset="/cover-640.jpg 640w, /cover-1280.jpg 1280w"
             width="1280" height="720" alt="Tournament room" />
      </div></article></body></html>`,
      "https://texaschess.org/92nd-southwest-open/"
    );
    expect(detail).toMatchObject({
      startDate: "2026-09-04",
      endDate: "2026-09-07",
      city: "Irving",
      state: "TX",
      zip: "75063",
      registrationUrl: "https://register.example.com/swo",
      imageUrl: "https://texaschess.org/cover-1280.jpg",
    });
  });

  it("parses the live Southwest Open detail page without a comma before TX", () => {
    const html = readFileSync(
      join(
        process.cwd(),
        "ingestion/fixtures/incoming/tca-92nd-southwest-open.html"
      ),
      "utf8"
    );
    const detail = parseTcaDetailHtml(
      html,
      "https://texaschess.org/92nd-southwest-open/"
    );
    expect(detail).toMatchObject({
      startDate: "2026-09-04",
      endDate: "2026-09-07",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      address: "303 Blum St",
      registrationUrl: "https://www.kingregistration.com/event/92SWO",
    });
    expect(detail.venueName).toMatch(/La Quinta Inn/i);
    expect(detail.venueName).not.toMatch(/^20\d{2}/);
    expect(detail.startDate).not.toBe("2026-06-20");
  });

  it("preserves the listing picture on the staged competition", () => {
    const raw = parseTcaListingHtml(fixture).find(
      (row) => row.name === "92nd Southwest Open"
    )!;
    const liveImage = "https://texaschess.org/wp-content/uploads/92SWO.png";
    const row = normalizeRawTca(
      { ...raw, imageUrl: liveImage },
      {
        id: "00000000-0000-4000-8000-000000000321",
      }
    );
    expect(row?.source).toBe("tca_scrape");
    expect(row?.image_url).toBe(liveImage);
    expect(row?.status).toBe("draft");
  });

  it("preserves an existing cover when a later scrape misses the image", () => {
    const existing = "https://organizer.example.com/cover.jpg";
    expect(preserveExistingImage(null, existing)).toBe(existing);
    expect(
      preserveExistingImage("https://organizer.example.com/new.jpg", existing)
    ).toBe("https://organizer.example.com/new.jpg");
  });

  it("registers the source across ingestion tables", () => {
    expect(migration.match(/'tca_scrape'/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("'Texas Chess Association'");
  });
});
