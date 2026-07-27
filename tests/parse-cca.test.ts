import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeHtmlBuffer } from "@/ingestion/fetch-html";
import {
  normalizeRawCca,
  parseCcaDateRange,
  yearForCcaMonth,
} from "@/ingestion/normalize-cca";
import {
  cleanCcaText,
  parseCcaDetailHtml,
  parseCcaListingHtml,
} from "@/ingestion/parse-cca";

const fixture = decodeHtmlBuffer(
  readFileSync(join(process.cwd(), "ingestion/fixtures/cca-refs.html"))
);

describe("CCA date parsing", () => {
  it("parses multi-schedule CCA date lines", () => {
    expect(parseCcaDateRange("July 17-19 or 18-19, 2026")).toEqual({
      start: "2026-07-17",
      end: "2026-07-19",
    });
  });

  it("rolls coming-event months in the past to next year", () => {
    const july = new Date("2026-07-27T12:00:00Z");
    expect(yearForCcaMonth("Jan", july)).toBe(2027);
    expect(yearForCcaMonth("June", july)).toBe(2027);
    expect(yearForCcaMonth("August", july)).toBe(2026);
  });
});

describe("CCA text cleanup", () => {
  it("strips Word bullets from names", () => {
    expect(cleanCcaText("• Bradley Open")).toBe("Bradley Open");
  });
});

describe("CCA listing parser", () => {
  it("finds linked tournament detail pages from refs.html", () => {
    const rows = parseCcaListingHtml(fixture);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    const southern = rows.find((r) => /so26\.htm/i.test(r.detailUrl));
    expect(southern).toBeDefined();
    expect(southern!.detailUrl).toContain("chesstour.com");
  });

  it("tags normalized rows with cca_scrape provenance", () => {
    const raw = parseCcaListingHtml(fixture).find((r) => /so26/i.test(r.detailUrl))!;
    const row = normalizeRawCca(
      {
        ...raw,
        name: "Southern Open",
        dateText: "July 17-19, 2026",
        city: "Kissimmee",
        state: "FL",
      },
      {
        id: "00000000-0000-4000-8000-00000000cca1",
        detail: {
          venueName: "Holiday Inn Resort",
          address: "3011 Maingate Lane",
          city: "Kissimmee",
          state: "FL",
          zip: "34747",
          titleName: "Southern Open",
          dateText: "July 17-19 or 18-19, 2026",
          endDate: "2026-07-19",
          imageUrl: null,
          bodyText: null,
        },
        coords: { lat: 28.3, lng: -81.5 },
      }
    );
    expect(row?.competition.source).toBe("cca_scrape");
    expect(row?.competition.source_url).toContain("so26.htm");
    expect(row?.competition.reg_url).toContain("chessaction.com");
    expect(row?.competition.status).toBe("published");
    expect(row?.competition.slug).toMatch(/^cca-/);
  });
});

describe("CCA detail parser", () => {
  it("extracts hotel address and zip from detail HTML", () => {
    const html = `
      <title>Southern Open chess tournament</title>
      <body>
        34th annual SOUTHERN OPEN
        July 17-19 or 18-19, 2026
        Florida
        Holiday Inn Resort Kissimmee By The Parks,
        3011 Maingate Lane, Kissimmee, FL 34747
      </body>
    `;
    const detail = parseCcaDetailHtml(html);
    expect(detail.zip).toBe("34747");
    expect(detail.city).toBe("Kissimmee");
    expect(detail.state).toBe("FL");
    expect(detail.titleName).toMatch(/Southern Open/i);
  });

  it("parses multi-option dates and City ST ZIP without a comma", () => {
    const html = `
      <body>
        56th annual CONTINENTAL OPEN
        August 13-16, 14-16 or 15-16, 2026
        Hilton Boston/Woburn Hotel, 2 Forbes Road, Woburn, MA 01801
      </body>
    `;
    const detail = parseCcaDetailHtml(html);
    expect(detail.dateText).toMatch(/August 13-16/i);
    expect(detail.zip).toBe("01801");
    expect(detail.titleName).toMatch(/Continental Open/i);
  });

  it("parses Windsor Locks style addresses without comma before state", () => {
    const html = `
      <body>
        31st annual Bradley Open
        JULY 24-26 OR 25-26, 2026
        Sheraton Hartford Hotel at Bradley Airport, 1 Bradley Airport, Windsor Locks CT 06096
      </body>
    `;
    const detail = parseCcaDetailHtml(html);
    expect(detail.zip).toBe("06096");
    expect(detail.city).toMatch(/Windsor Locks/i);
    expect(detail.state).toBe("CT");
    expect(detail.titleName).toMatch(/Bradley Open/i);
  });

  it("strips (near …) notes so Irvine CA zips resolve", () => {
    const html = `
      <body>
        31st annual Pacific Coast Open
        August 1-2, 2026
        Hilton Orange County Airport Hotel, 18800 Macarthur Blvd., Irvine (near Los Angeles), CA 92612
      </body>
    `;
    const detail = parseCcaDetailHtml(html);
    expect(detail.zip).toBe("92612");
    expect(detail.city).toMatch(/Irvine/i);
    expect(detail.state).toBe("CA");
    expect(detail.titleName).toMatch(/Pacific Coast Open/i);
  });

  it("handles ATLANTICOPEN glue and NW street addresses", () => {
    const html = `
      <body>
        58th annual ATLANTICOPEN August 21-23 or 22-23, 2026
        Omni Shoreham Hotel, 2500 Calvert Street, NW., Washington, DC 20008
      </body>
    `;
    const detail = parseCcaDetailHtml(html);
    expect(detail.titleName).toBe("Atlantic Open");
    expect(detail.zip).toBe("20008");
    expect(detail.city).toMatch(/Washington/i);
    expect(detail.state).toBe("DC");
    expect(detail.venueName).toMatch(/Omni Shoreham/i);
  });
});

describe("fetchHtml charset decode", () => {
  it("decodes windows-1252 meta as bullets, not replacement chars", () => {
    const bullet = Buffer.from([0x95]); // • in windows-1252
    const html = Buffer.concat([
      Buffer.from(
        '<html><head><meta http-equiv=Content-Type content="text/html; charset=windows-1252"></head><body>'
      ),
      bullet,
      Buffer.from(" Bradley Open</body></html>"),
    ]);
    const decoded = decodeHtmlBuffer(html);
    expect(decoded).toContain("• Bradley Open");
    expect(decoded).not.toContain("\uFFFD");
  });
});
