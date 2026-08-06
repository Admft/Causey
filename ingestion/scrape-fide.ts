/**
 * FIDE Calendar scraper — calendar.fide.com tiles.
 *
 * US tiles usually have city + state but no ZIP. Resolve via GeoNames
 * city→zip + Supabase `zips` (geo_precision: city). International stay draft.
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
  parseFideLocation,
} from "./normalize-fide";
import { parseFideCalendarHtml } from "./parse-fide";
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

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (const row of raw) {
    const loc = parseFideLocation(row.locationText || row.city);
    const resolved =
      loc.state !== "XX"
        ? await geo.resolveLocation({ city: loc.city, state: loc.state })
        : null;
    const competition = normalizeRawFide(row, {
      id: newId(),
      coords: resolved?.coords ?? null,
      zip: resolved?.zip ?? null,
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
