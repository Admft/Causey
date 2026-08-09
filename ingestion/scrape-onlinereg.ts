/**
 * OnlineRegistration.cc current-tournaments scraper.
 *
 * Listing pages only expose State (no street/ZIP). Public detail/buy pages
 * also omit venue address, so we resolve city from organizer/title via
 * GeoNames city→zip, then Supabase `zips` centroids (geo_precision: city).
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
  createZipGeo,
  guessCityFromText,
  loadCityZipIndex,
} from "./geo";
import { stateToCode } from "./normalize";
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
import { extractPageImage } from "./extract-page-image";
import { fetchHtml } from "./fetch-html";

const STAGING_FILE = "onlinereg-drafts.json";

async function main() {
  console.log(`Scraper: ${ONLINEREG_LISTING_URL} → source='${ONLINEREG_SCRAPER_ID}'`);

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, ONLINEREG_SCRAPER_ID);
    return;
  }

  const listingShell = await loadListingHtml({ url: ONLINEREG_LISTING_URL });
  const html = process.env.SCRAPE_HTML_FILE
    ? listingShell
    : await fetchHtml(
        "https://onlineregistration.cc/tournaments/ajaxFrontGetTourListNew.php",
        {
          method: "POST",
          body: new URLSearchParams({ vendor_search: "0", length: "-1" }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: ONLINEREG_LISTING_URL,
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );
  const fallbackImage = extractPageImage(listingShell, ONLINEREG_LISTING_URL, {
    allowSiteChrome: true,
  });
  let raw = parseOnlineRegIndexHtml(html);
  console.log(`Parsed ${raw.length} OnlineRegistration events.`);
  raw = capRows(raw);

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const cityIndex = await loadCityZipIndex();
  const drafts: StagedCompetition[] = [];

  for (const row of raw) {
    const state = row.stateName ? stateToCode(row.stateName) : null;
    const guessTexts = [row.organizerHint, row.name].filter(Boolean).join(" | ");
    const city =
      (state && guessCityFromText(cityIndex, guessTexts, state)) || null;
    const resolved = state
      ? await geo.resolveLocation({ city, state })
      : null;

    const competition = normalizeRawOnlineReg(row, {
      id: newId(),
      city,
      coords: resolved?.coords ?? null,
      zip: resolved?.zip ?? null,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition) continue;
    drafts.push({
      ...competition,
      image_url: competition.image_url || fallbackImage,
      sections: [openSection("Open")],
    });
  }

  const published = drafts.filter((d) => d.status === "published").length;
  console.log(
    `Normalized ${drafts.length} (published ${published}, draft ${drafts.length - published}).`
  );
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
