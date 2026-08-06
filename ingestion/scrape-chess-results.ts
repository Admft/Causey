/**
 * Chess-Results.com USA tournament-search scraper.
 *
 *   npm run scrape:chess-results
 *   SCRAPE_HTML_FILE=ingestion/fixtures/chess-results-usa-search.html npm run scrape:chess-results
 */
import { pathToFileURL } from "node:url";
import {
  CHESS_RESULTS_LISTING_URL,
  CHESS_RESULTS_SCRAPER_ID,
  normalizeRawChessResults,
  parseChessResultsLocation,
} from "./normalize-chess-results";
import { parseChessResultsSearchHtml } from "./parse-chess-results";
import { createZipGeo } from "./geo";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";
import { openSection } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import { getServiceRoleClient } from "../lib/supabase/client";

const STAGING_FILE = "chess-results-drafts.json";

async function main() {
  console.log(
    `Scraper: ${CHESS_RESULTS_LISTING_URL} → source='${CHESS_RESULTS_SCRAPER_ID}'`
  );

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, CHESS_RESULTS_SCRAPER_ID);
    return;
  }

  const html = await loadListingHtml({ url: CHESS_RESULTS_LISTING_URL });
  let raw = parseChessResultsSearchHtml(html).filter(
    (r) => !r.federation || r.federation === "USA"
  );
  console.log(`Parsed ${raw.length} USA Chess-Results rows.`);
  raw = capRows(raw);

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (const row of raw) {
    const loc = parseChessResultsLocation(row.locationText);
    const resolved = await geo.resolveLocation({
      zip: loc.zip,
      city: loc.city,
      state: loc.state,
    });
    const competition = normalizeRawChessResults(row, {
      id: newId(),
      coords: resolved?.coords ?? null,
      zip: resolved?.zip ?? loc.zip,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition) continue;
    drafts.push({
      ...competition,
      sections: [openSection("Open")],
    });
  }

  const published = drafts.filter((d) => d.status === "published").length;
  console.log(
    `Normalized ${drafts.length} (published ${published}, draft ${drafts.length - published}).`
  );
  await upsertOrExit(drafts, CHESS_RESULTS_SCRAPER_ID, STAGING_FILE, {
    listing: CHESS_RESULTS_LISTING_URL,
    parsed: raw.length,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
