/**
 * Chess-Results.com USA tournament-search scraper.
 *
 *   npm run scrape:chess-results
 *   SCRAPE_HTML_FILE=ingestion/fixtures/chess-results-usa-search.html npm run scrape:chess-results
 */
import { load } from "cheerio";
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
import { decodeHtmlBuffer, fetchResponseWithRetry } from "./fetch-html";

const STAGING_FILE = "chess-results-drafts.json";
const USER_AGENT =
  "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)";

async function fetchLiveUsaSearch(): Promise<{
  listingShell: string;
  resultsHtml: string;
}> {
  const initial = await fetchResponseWithRetry(CHESS_RESULTS_LISTING_URL, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!initial.ok) {
    throw new Error(
      `Chess-Results search fetch failed: HTTP ${initial.status}`
    );
  }
  const listingShell = decodeHtmlBuffer(
    Buffer.from(await initial.arrayBuffer()),
    initial.headers.get("content-type")
  );
  const $ = load(listingShell);
  const action = new URL(
    $("form").first().attr("action") || initial.url,
    initial.url
  ).toString();
  const body = new URLSearchParams();
  $("form input[type='hidden']").each((_, input) => {
    const name = $(input).attr("name");
    if (name) body.set(name, $(input).attr("value") ?? "");
  });
  $("form input[type='text']").each((_, input) => {
    const name = $(input).attr("name");
    if (name) body.set(name, "");
  });
  const year = new Date().getUTCFullYear();
  body.set("ctl00$P1$combo_art", "5");
  body.set("ctl00$P1$combo_sort", "3");
  body.set("ctl00$P1$combo_land", "USA");
  body.set("ctl00$P1$combo_bedenkzeit", "0");
  body.set("ctl00$P1$combo_anzahl_zeilen", "5");
  body.set("ctl00$P1$txt_von_tag", new Date().toISOString().slice(0, 10));
  body.set("ctl00$P1$txt_bis_tag", `${year + 1}-12-31`);
  body.set("ctl00$P1$cb_suchen", "Search");

  const cookie = initial.headers.get("set-cookie")?.split(";")[0] ?? "";
  const results = await fetchResponseWithRetry(action, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      Referer: initial.url,
    },
    body,
    redirect: "follow",
  });
  if (!results.ok) {
    throw new Error(
      `Chess-Results search submit failed: HTTP ${results.status}`
    );
  }
  return {
    listingShell,
    resultsHtml: decodeHtmlBuffer(
      Buffer.from(await results.arrayBuffer()),
      results.headers.get("content-type")
    ),
  };
}

async function main() {
  console.log(
    `Scraper: ${CHESS_RESULTS_LISTING_URL} → source='${CHESS_RESULTS_SCRAPER_ID}'`
  );

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, CHESS_RESULTS_SCRAPER_ID);
    return;
  }

  const { listingShell, resultsHtml } = process.env.SCRAPE_HTML_FILE
    ? {
        listingShell: await loadListingHtml({
          url: CHESS_RESULTS_LISTING_URL,
        }),
        resultsHtml: "",
      }
    : await fetchLiveUsaSearch();
  const html = resultsHtml || listingShell;
  let raw = parseChessResultsSearchHtml(html).filter(
    (r) => !r.federation || r.federation === "USA"
  );
  console.log(`Parsed ${raw.length} USA Chess-Results rows.`);
  if (raw.length === 0) {
    throw new Error(
      "Chess-Results returned zero USA events; refusing to stage an empty scrape."
    );
  }
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
      external_key: row.externalKey,
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
