/**
 * US Chess upcoming-tournaments scraper — primary supply feed.
 *
 * Source site: https://new.uschess.org/upcoming-tournaments
 * Pipeline id stored on every row: source = 'tla_scrape'
 * Provenance URL stored on every row: source_url = the event's US Chess page
 *
 * Flow:
 *   1. Paginate the listing (Cheerio — Drupal server-renders the cards)
 *   2. For each event, fetch the detail page for address / zip / organizer site
 *   3. Resolve lat/lng via the Supabase zips table when zip is known
 *   4. Upsert into competitions (published when location resolves, else draft)
 *
 * Runs ONLY via `npm run scrape:tla` or the GitHub Actions cron — never during
 * build or page requests.
 *
 * Local fixture (no network listing fetch):
 *   SCRAPE_HTML_FILE=ingestion/fixtures/upcoming-tournaments-page0.html npm run scrape:tla
 */
import { load } from "cheerio";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { extractPageImage } from "./extract-page-image";
import { fetchHtml, fetchPublicHtml } from "./fetch-html";
import {
  normalizeRawTla,
  SCRAPER_SITE,
  type DetailEnrichment,
  type RawTla,
} from "./normalize";
import {
  findOrganizerEventUrlInSitemap,
  LISTING_URL,
  maxPagerPage,
  parseDetailHtml,
  parseListingHtml,
} from "./parse-uschess";
import {
  loadDotEnv,
  loadStagedCompetitions,
  loadStagingMetadata,
  persistScrapeBatch,
  stageCompetitions,
  type StagedCompetition,
} from "./persist";

loadDotEnv();

const DETAIL_DELAY_MS = 350;
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? "40");
const SKIP_DETAIL = process.env.SCRAPE_SKIP_DETAIL === "1";
const organizerPageCache = new Map<string, Promise<string | null>>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cachedOrganizerFetch(url: string): Promise<string | null> {
  const cached = organizerPageCache.get(url);
  if (cached) return cached;
  const request = (async () => {
    try {
      await sleep(DETAIL_DELAY_MS);
      return await fetchPublicHtml(url);
    } catch {
      return null;
    }
  })();
  organizerPageCache.set(url, request);
  return request;
}

async function enrichFromOrganizerSite(
  detail: DetailEnrichment,
  eventName: string,
  eventDate: string
): Promise<void> {
  if (!detail.organizerWebsite || detail.imageUrl) return;

  const homepageHtml = await cachedOrganizerFetch(detail.organizerWebsite);
  if (!homepageHtml) return;

  // Squarespace product/event pages are reliably listed in sitemap.xml even
  // when the US Chess record provides only the organizer homepage.
  if (!detail.registrationUrl && /squarespace/i.test(homepageHtml)) {
    const sitemapUrl = new URL("/sitemap.xml", detail.organizerWebsite).toString();
    const sitemapXml = await cachedOrganizerFetch(sitemapUrl);
    if (sitemapXml) {
      detail.registrationUrl = findOrganizerEventUrlInSitemap(
        sitemapXml,
        eventName,
        detail.organizerWebsite,
        eventDate
      );
    }
  }

  if (detail.registrationUrl) {
    const eventHtml = await cachedOrganizerFetch(detail.registrationUrl);
    if (eventHtml) {
      detail.imageUrl = extractPageImage(eventHtml, detail.registrationUrl);
    }
  }

}

async function loadListingPages(): Promise<RawTla[]> {
  const fixture = process.env.SCRAPE_HTML_FILE;
  if (fixture) {
    const path = fixture.startsWith("/") ? fixture : join(process.cwd(), fixture);
    console.log(`Using local fixture: ${path}`);
    return parseListingHtml(readFileSync(path, "utf8"));
  }

  const byUrl = new Map<string, RawTla>();
  let page = 0;
  let lastPage = 0;

  while (page <= lastPage && page < MAX_PAGES) {
    const url = page === 0 ? LISTING_URL : `${LISTING_URL}?page=${page}`;
    console.log(`Fetching listing page ${page}: ${url}`);
    const html = await fetchHtml(url);
    const $ = load(html);
    if (page === 0) lastPage = maxPagerPage($);
    const rows = parseListingHtml(html);
    console.log(`  → ${rows.length} events (pager max page=${lastPage})`);
    if (rows.length === 0) break;
    for (const r of rows) byUrl.set(r.detailUrl, r);
    page += 1;
    await sleep(200);
  }

  return [...byUrl.values()];
}

async function main() {
  console.log(`Scraper: ${SCRAPER_SITE} → source='tla_scrape'`);

  // Re-upsert last successful scrape without re-fetching the web.
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    const drafts = loadStagedCompetitions("tla-drafts.json");
    const staging = loadStagingMetadata("tla-drafts.json");
    console.log(`Upsert-only mode: loading ${drafts.length} staged TLA rows`);
    const client = getServiceRoleClient();
    if (!client) {
      console.error("Need Supabase env vars for upsert-only.");
      process.exit(1);
    }
    await persistScrapeBatch(client, drafts, "tla_scrape", {
      scrapeRunSource: "tla_scrape",
      meta: { mode: "upsert_only" },
      completeSourceSnapshot:
        process.env.SCRAPE_COMPLETE_SNAPSHOT === "1" &&
        staging?.completeSourceSnapshot === true &&
        staging.rowCount === drafts.length,
    });
    return;
  }

  const raws = await loadListingPages();
  console.log(`Parsed ${raws.length} unique listing events.`);
  if (raws.length === 0) {
    console.error(
      "0 rows parsed — listing markup may have changed. " +
        "Update selectors in ingestion/parse-uschess.ts using the saved HTML fixture."
    );
    process.exit(1);
  }

  const client = getServiceRoleClient();
  const zipCache = new Map<string, { lat: number; lng: number } | null>();

  async function coordsForZip(zip: string | null) {
    if (!zip || !client) return null;
    if (zipCache.has(zip)) return zipCache.get(zip)!;
    const { data, error } = await client
      .from("zips")
      .select("lat,lng")
      .eq("zip", zip)
      .maybeSingle();
    if (error) {
      console.warn(`zip lookup failed for ${zip}: ${error.message}`);
      zipCache.set(zip, null);
      return null;
    }
    const coords = data ? { lat: data.lat as number, lng: data.lng as number } : null;
    zipCache.set(zip, coords);
    return coords;
  }

  const drafts: StagedCompetition[] = [];
  let skippedOnline = 0;
  let skippedNormalize = 0;
  let sectionsParsed = 0;

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]!;
    let detail: DetailEnrichment | null = null;
    if (!SKIP_DETAIL) {
      try {
        process.stdout.write(
          `\rDetail ${i + 1}/${raws.length}: ${raw.name.slice(0, 48).padEnd(48)}`
        );
        const html = await fetchHtml(raw.detailUrl);
        detail = parseDetailHtml(html, raw.detailUrl);
        // US Chess pages often lack event photos and may provide only an
        // organizer homepage instead of the event's registration page.
        await enrichFromOrganizerSite(detail, raw.name, raw.dateText);
        await sleep(DETAIL_DELAY_MS);
      } catch (err) {
        console.warn(`\ndetail fetch failed for ${raw.detailUrl}:`, err);
      }
    }
    if (detail?.online) {
      skippedOnline += 1;
      continue;
    }
    const coords = await coordsForZip(detail?.zip ?? null);
    const row = normalizeRawTla(raw, {
      id: randomUUID(),
      detail,
      coords,
    });
    if (!row) {
      skippedNormalize += 1;
      continue;
    }
    if (row.sections.length > 0) sectionsParsed += 1;
    drafts.push({
      ...row.competition,
      external_key: detail?.sourceExternalKey ?? raw.externalKey,
      sections: row.sections,
    });
  }
  if (!SKIP_DETAIL) process.stdout.write("\n");

  console.log(
    `Normalized ${drafts.length} rows ` +
      `(skipped online=${skippedOnline}, normalize=${skippedNormalize}).`
  );
  console.log(
    `  sections parsed on ${sectionsParsed}/${drafts.length} events ` +
      `(others get Open fallback).`
  );
  const published = drafts.filter((d) => d.status === "published").length;
  console.log(`  ready to show (published): ${published}`);
  console.log(`  needs location review (draft): ${drafts.length - published}`);

  const completeSourceSnapshot =
    !process.env.SCRAPE_HTML_FILE &&
    !process.env.SCRAPE_MAX_EVENTS &&
    skippedNormalize === 0;
  stageCompetitions("tla-drafts.json", drafts, { completeSourceSnapshot });

  if (process.env.SCRAPE_STAGE_ONLY === "1") {
    console.log("Stage-only mode — no database writes.");
    return;
  }

  if (!client) {
    const msg =
      "No Supabase configured — staging file is the output. Set .env to upsert.";
    if (process.env.REQUIRE_SUPABASE === "1" || process.env.CI === "true") {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    console.log(
      "Done. Every row has source='tla_scrape' and source_url set to its US Chess page."
    );
    return;
  }

  await persistScrapeBatch(client, drafts, "tla_scrape", {
    scrapeRunSource: "tla_scrape",
    meta: { listing: LISTING_URL, site: SCRAPER_SITE },
    completeSourceSnapshot:
      completeSourceSnapshot &&
      process.env.SCRAPE_COMPLETE_SNAPSHOT !== "0",
  });
  console.log(
    "Done. Every row has source='tla_scrape' and source_url set to its US Chess page."
  );
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
