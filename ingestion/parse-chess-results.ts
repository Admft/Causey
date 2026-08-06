/**
 * Chess-Results.com tournament search parser (USA upcoming filter).
 * Fixture: ingestion/fixtures/chess-results-usa-search.html
 *
 * Rows come from the daten table; each tournament name links to tnrNNNN.aspx.
 */
import * as cheerio from "cheerio";

export type RawChessResultsEvent = {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  locationText: string;
  federation: string;
  timeControl: string | null;
  detailUrl: string;
  externalKey: string; // tnr id
  /** Approximate players from the search grid when present. */
  playerCount: number | null;
  roundCount: number | null;
};

function toIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseChessResultsSearchHtml(html: string): RawChessResultsEvent[] {
  const $ = cheerio.load(html);
  const out: RawChessResultsEvent[] = [];
  const seen = new Set<string>();

  $('a[href*="tnr"][href$=".aspx?lan=1"], a[href*="tnr"][href*=".aspx"]').each(
    (_, a) => {
      const href = $(a).attr("href") ?? "";
      const tnr = href.match(/tnr(\d+)\.aspx/i)?.[1];
      if (!tnr || seen.has(tnr)) return;

      const name = $(a).text().replace(/\s+/g, " ").trim();
      if (name.length < 3) return;

      const tr = $(a).closest("tr");
      const cells = tr
        .find("td")
        .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();
      if (cells.length < 10) return;

      // Cell layout (from fixture):
      // 0 No. | 1 Name | 2 FED | … | 5 from | 6 to | … | 12 Location | 13 TC | 14 FED | …
      // … | 16 Rd | 17 players-ish | 18 tnr | 19 EventID
      const federation = (cells[2] || cells[14] || "").toUpperCase();
      const startDate = toIso(cells[5] ?? "");
      const endDate = toIso(cells[6] ?? "");
      if (!startDate) return;

      const locationText = cells[12] ?? "";
      const timeControl = cells[13] || null;
      const roundCount = /^\d+$/.test(cells[16] ?? "") ? Number(cells[16]) : null;
      const playerCount = /^\d+$/.test(cells[17] ?? "") ? Number(cells[17]) : null;

      const abs = href.startsWith("http")
        ? href.split("?")[0] + "?lan=1"
        : `https://chess-results.com/tnr${tnr}.aspx?lan=1`;

      seen.add(tnr);
      out.push({
        name,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : null,
        locationText,
        federation,
        timeControl,
        detailUrl: abs,
        externalKey: tnr,
        playerCount,
        roundCount,
      });
    }
  );

  return out;
}
