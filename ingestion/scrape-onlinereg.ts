/**
 * OnlineRegistration.cc current-tournaments scraper.
 *
 *   npm run scrape:onlinereg
 *   SCRAPE_HTML_FILE=ingestion/fixtures/onlinereg-tournaments-index.html npm run scrape:onlinereg
 */
import { pathToFileURL } from "node:url";
import {
  ONLINEREG_LISTING_URL,
  ONLINEREG_SCRAPER_ID,
  normalizeRawOnlineReg,
} from "./normalize-onlinereg";
import { parseOnlineRegIndexHtml } from "./parse-onlinereg";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";
import type { StagedCompetition } from "./persist";

const STAGING_FILE = "onlinereg-drafts.json";

async function main() {
  console.log(`Scraper: ${ONLINEREG_LISTING_URL} → source='${ONLINEREG_SCRAPER_ID}'`);

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, ONLINEREG_SCRAPER_ID);
    return;
  }

  const html = await loadListingHtml({ url: ONLINEREG_LISTING_URL });
  let raw = parseOnlineRegIndexHtml(html);
  console.log(`Parsed ${raw.length} OnlineRegistration events.`);
  raw = capRows(raw);

  const drafts: StagedCompetition[] = [];
  for (const row of raw) {
    const competition = normalizeRawOnlineReg(row, { id: newId() });
    if (!competition) continue;
    drafts.push({
      ...competition,
      sections: [{ name: "Open", entry_fee_cents: null }],
    });
  }

  const published = drafts.filter((d) => d.status === "published").length;
  console.log(`Normalized ${drafts.length} (published ${published}, draft ${drafts.length - published}).`);
  await upsertOrExit(drafts, ONLINEREG_SCRAPER_ID, STAGING_FILE, {
    listing: ONLINEREG_LISTING_URL,
    parsed: raw.length,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
