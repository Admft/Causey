import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeRawCca, parseCcaDateRange } from "@/ingestion/normalize-cca";
import {
  parseCcaDetailHtml,
  parseCcaListingHtml,
} from "@/ingestion/parse-cca";

const fixture = readFileSync(
  join(process.cwd(), "ingestion/fixtures/cca-refs.html"),
  "utf8"
);

describe("CCA date parsing", () => {
  it("parses multi-schedule CCA date lines", () => {
    expect(parseCcaDateRange("July 17-19 or 18-19, 2026")).toEqual({
      start: "2026-07-17",
      end: "2026-07-19",
    });
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
        },
        coords: { lat: 28.3, lng: -81.5 },
      }
    );
    expect(row?.source).toBe("cca_scrape");
    expect(row?.source_url).toContain("so26.htm");
    expect(row?.reg_url).toContain("chessaction.com");
    expect(row?.status).toBe("published");
    expect(row?.slug).toMatch(/^cca-/);
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
});
