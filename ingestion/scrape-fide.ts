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
import { fetchHtml } from "./fetch-html";

const STAGING_FILE = "fide-drafts.json";
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? "40");

async function main() {
  console.log(`Scraper: ${FIDE_LISTING_URL} → source='${FIDE_SCRAPER_ID}'`);

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, FIDE_SCRAPER_ID);
    return;
  }

  const listingShell = await loadListingHtml({ url: FIDE_LISTING_URL });
  let raw;
  if (process.env.SCRAPE_HTML_FILE) {
    raw = parseFideCalendarHtml(listingShell);
  } else {
    const byKey = new Map<
      string,
      ReturnType<typeof parseFideCalendarHtml>[number]
    >();
    const year = new Date().getUTCFullYear();
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const html = await fetchHtml(
        "https://calendar.fide.com/calendar_server.php",
        {
          method: "POST",
          body: new URLSearchParams({
            show: "tiles",
            page: String(page),
            country: "all",
            event_type: "all",
            time_control: "all",
            from_date: new Date().toISOString().slice(0, 10),
            to_date: `${year}-12-31`,
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: FIDE_LISTING_URL,
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );
      const pageRows = parseFideCalendarHtml(html);
      for (const row of pageRows) byKey.set(row.externalKey, row);
      if (pageRows.length === 0 || pageRows.length < 15) break;
    }
    raw = [...byKey.values()];
  }
  console.log(`Parsed ${raw.length} FIDE calendar tiles.`);
  if (raw.length === 0) {
    throw new Error(
      "FIDE returned zero events; refusing to stage an empty scrape."
    );
  }
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
      external_key: row.externalKey,
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
