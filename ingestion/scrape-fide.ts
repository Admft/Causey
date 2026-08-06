/**
 * FIDE Calendar scraper — calendar.fide.com tiles.
 *
 *   npm run scrape:fide
 *   SCRAPE_HTML_FILE=ingestion/fixtures/fide-calendar-tiles.html npm run scrape:fide
 *   SCRAPE_UPSERT_ONLY=1 npm run scrape:fide
 */
import { pathToFileURL } from "node:url";
import {
  FIDE_LISTING_URL,
  FIDE_SCRAPER_ID,
  normalizeRawFide,
} from "./normalize-fide";
import { parseFideCalendarHtml } from "./parse-fide";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";
import type { StagedCompetition } from "./persist";

const STAGING_FILE = "fide-drafts.json";

async function main() {
  console.log(`Scraper: ${FIDE_LISTING_URL} → source='${FIDE_SCRAPER_ID}'`);

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, FIDE_SCRAPER_ID);
    return;
  }

  const html = await loadListingHtml({ url: FIDE_LISTING_URL });
  let raw = parseFideCalendarHtml(html);
  console.log(`Parsed ${raw.length} FIDE calendar tiles.`);
  raw = capRows(raw);

  const drafts: StagedCompetition[] = [];
  for (const row of raw) {
    const competition = normalizeRawFide(row, { id: newId() });
    if (!competition) continue;
    drafts.push({
      ...competition,
      sections: [{ name: "Open", entry_fee_cents: null }],
    });
  }

  const published = drafts.filter((d) => d.status === "published").length;
  console.log(`Normalized ${drafts.length} (published ${published}, draft ${drafts.length - published}).`);
  await upsertOrExit(drafts, FIDE_SCRAPER_ID, STAGING_FILE, {
    listing: FIDE_LISTING_URL,
    parsed: raw.length,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
