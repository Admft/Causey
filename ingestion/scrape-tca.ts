/**
 * Texas Chess Association tournament feed scraper.
 *
 *   npm run scrape:tca
 *   SCRAPE_HTML_FILE="ingestion/fixtures/incoming/TCA and TCA Club Events _ Texas Chess Association.html" \
 *     npm run scrape:tca
 */
import { pathToFileURL } from "node:url";
import { fetchHtml } from "./fetch-html";
import { createZipGeo } from "./geo";
import {
  normalizeRawTca,
  TCA_LISTING_URL,
  TCA_SCRAPER_ID,
} from "./normalize-tca";
import {
  parseTcaDetailHtml,
  parseTcaListingHtml,
  parseTcaNextPageUrl,
  type RawTcaEvent,
  type TcaDetail,
} from "./parse-tca";
import { parseEventTextExtras } from "./parse-sections";
import {
  capRows,
  loadFixtureHtml,
  newId,
  runUpsertOnly,
  sleep,
  upsertOrExit,
} from "./scrape-hub-utils";
import type { StagedCompetition } from "./persist";
import { getServiceRoleClient } from "../lib/supabase/client";

const STAGING_FILE = "tca-drafts.json";
const DETAIL_DELAY_MS = 250;
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? "10");
const SKIP_DETAIL = process.env.SCRAPE_SKIP_DETAIL === "1";
const TCA_USER_AGENT =
  process.env.TCA_USER_AGENT ??
  "Mozilla/5.0 (compatible; Causey/0.1; +https://causey.dev)";

async function loadListingPages(): Promise<RawTcaEvent[]> {
  const fixture = process.env.SCRAPE_HTML_FILE;
  if (fixture) return parseTcaListingHtml(loadFixtureHtml(fixture));

  const byUrl = new Map<string, RawTcaEvent>();
  let nextUrl: string | null = TCA_LISTING_URL;
  let page = 0;
  while (nextUrl && page < MAX_PAGES) {
    console.log(`Fetching TCA listing page ${page + 1}: ${nextUrl}`);
    const html = await fetchHtml(nextUrl, { userAgent: TCA_USER_AGENT });
    const rows = parseTcaListingHtml(html, nextUrl);
    for (const row of rows) byUrl.set(row.detailUrl, row);
    nextUrl = parseTcaNextPageUrl(html, nextUrl);
    page += 1;
    if (nextUrl) await sleep(DETAIL_DELAY_MS);
  }
  return [...byUrl.values()];
}

async function main() {
  console.log(`Scraper: ${TCA_LISTING_URL} → source='${TCA_SCRAPER_ID}'`);
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, TCA_SCRAPER_ID);
    return;
  }

  let raw = await loadListingPages();
  if (!raw.length) {
    throw new Error("0 TCA tournament cards parsed — check the saved fixture and selectors.");
  }
  const withoutPictures = raw.filter((row) => !row.imageReference);
  if (withoutPictures.length) {
    throw new Error(
      `TCA image coverage regressed: ${withoutPictures.length}/${raw.length} cards have no picture.`
    );
  }
  console.log(`Parsed ${raw.length} TCA cards; picture coverage ${raw.length}/${raw.length}.`);
  raw = capRows(raw);

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const row = raw[index]!;
    let detail: TcaDetail | null = null;
    if (!SKIP_DETAIL) {
      try {
        process.stdout.write(
          `\rDetail ${index + 1}/${raw.length}: ${row.name.slice(0, 52).padEnd(52)}`
        );
        const html = await fetchHtml(row.detailUrl, {
          userAgent: TCA_USER_AGENT,
        });
        detail = parseTcaDetailHtml(html, row.detailUrl);
        await sleep(DETAIL_DELAY_MS);
      } catch (error) {
        console.warn(`\nTCA detail fetch failed for ${row.detailUrl}:`, error);
      }
    }

    const resolved = await geo.resolveLocation({
      zip: detail?.zip,
      city: detail?.city,
      state: detail?.state ?? "TX",
    });
    const competition = normalizeRawTca(row, {
      id: newId(),
      detail,
      coords: resolved?.coords ?? null,
      resolvedZip: resolved?.zip ?? null,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition) continue;
    const extras = parseEventTextExtras(
      [row.excerpt, detail?.bodyText].filter(Boolean).join("\n"),
      row.name
    );
    drafts.push({
      ...competition,
      external_key: row.externalKey,
      sections: extras.sections,
    });
  }
  if (!SKIP_DETAIL) process.stdout.write("\n");

  const withPictures = drafts.filter((row) => row.image_url).length;
  console.log(
    `Normalized ${drafts.length} TCA tournaments; pictures ${withPictures}/${drafts.length}.`
  );
  if (withPictures !== drafts.length) {
    throw new Error("Refusing to stage TCA rows without their tournament pictures.");
  }
  await upsertOrExit(drafts, TCA_SCRAPER_ID, STAGING_FILE, {
    listing: TCA_LISTING_URL,
    parsed: raw.length,
    pictures: withPictures,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
