/**
 * Continental Chess Association scraper (chesstour.com/refs.html).
 *
 * Pipeline id: source = 'cca_scrape'
 * Provenance:   source_url = CCA event detail page (or refs.html#coming-… )
 * Registration: event-specific CCA page; never the generic ChessAction homepage
 *
 * Resilience (same lessons as TLA runs):
 *   - Shared fetchHtml with timeout + windows-1252 charset decode
 *   - Always writes data/staging/cca-drafts.json BEFORE upsert
 *   - SCRAPE_UPSERT_ONLY=1 reloads that file and upserts (no re-fetch)
 *   - SCRAPE_HTML_FILE=… parses a local listing fixture
 *   - SCRAPE_SKIP_DETAIL=1 skips detail enrichment
 *   - SCRAPE_MAX_EVENTS=N caps work for baby tests
 *
 *   npm run scrape:cca
 *   SCRAPE_MAX_EVENTS=3 npm run scrape:cca
 *   SCRAPE_UPSERT_ONLY=1 npm run scrape:cca
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { extractPageImage } from "./extract-page-image";
import { decodeHtmlBuffer, fetchHtml } from "./fetch-html";
import {
  CCA_LISTING_URL,
  CCA_SCRAPER_ID,
  normalizeRawCca,
  type CcaDetailEnrichment,
  type RawCca,
} from "./normalize-cca";
import {
  parseCcaComingEvents,
  parseCcaDetailHtml,
  parseCcaListingHtml,
} from "./parse-cca";
import {
  loadDotEnv,
  loadStagedCompetitions,
  persistScrapeBatch,
  stageCompetitions,
  type StagedCompetition,
} from "./persist";

loadDotEnv();

const DETAIL_DELAY_MS = 300;
const SKIP_DETAIL = process.env.SCRAPE_SKIP_DETAIL === "1";
const INCLUDE_COMING = process.env.SCRAPE_CCA_COMING !== "0";
const MAX_EVENTS = Number(process.env.SCRAPE_MAX_EVENTS ?? "0");
const STAGING_FILE = "cca-drafts.json";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeListing(html: string): RawCca[] {
  const linked = parseCcaListingHtml(html);
  const coming = INCLUDE_COMING ? parseCcaComingEvents(html) : [];
  const linkedNames = new Set(
    linked.map((r) => r.name.toLowerCase().replace(/ blitz$/, ""))
  );
  const extras = coming.filter((c) => {
    const n = c.name.toLowerCase();
    for (const existing of linkedNames) {
      if (existing.includes(n) || n.includes(existing)) return false;
    }
    return true;
  });
  console.log(
    `Parsed ${linked.length} linked events + ${extras.length} coming-soon lines = ${linked.length + extras.length} total.`
  );
  return [...linked, ...extras];
}

async function main() {
  console.log(`Scraper: ${CCA_LISTING_URL} → source='${CCA_SCRAPER_ID}'`);

  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    const drafts = loadStagedCompetitions(STAGING_FILE);
    console.log(`Upsert-only mode: ${drafts.length} rows from data/staging/${STAGING_FILE}`);
    const client = getServiceRoleClient();
    if (!client) {
      console.error("Need Supabase env vars for upsert-only.");
      process.exit(1);
    }
    await persistScrapeBatch(client, drafts, CCA_SCRAPER_ID, {
      scrapeRunSource: "cca_scrape",
      meta: { mode: "upsert_only" },
    });
    return;
  }

  let html: string;
  const fixture = process.env.SCRAPE_HTML_FILE;
  if (fixture) {
    const path = fixture.startsWith("/") ? fixture : join(process.cwd(), fixture);
    console.log(`Using local fixture: ${path}`);
    // Fixture may be UTF-8 (browser save) or windows-1252 — sniff meta.
    html = decodeHtmlBuffer(readFileSync(path));
  } else {
    console.log(`Fetching ${CCA_LISTING_URL}`);
    html = await fetchHtml(CCA_LISTING_URL);
  }
  const fallbackImage = extractPageImage(html, CCA_LISTING_URL, {
    allowSiteChrome: true,
  });

  let raws = mergeListing(html);
  // Main events before blitz so location inheritance works.
  raws.sort((a, b) => Number(a.isBlitz) - Number(b.isBlitz));
  if (MAX_EVENTS > 0 && raws.length > MAX_EVENTS) {
    console.log(`SCRAPE_MAX_EVENTS=${MAX_EVENTS} — truncating from ${raws.length}.`);
    raws = raws.slice(0, MAX_EVENTS);
  }
  if (raws.length === 0) {
    console.error("0 CCA rows parsed — check selectors / fixture / charset.");
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
  let skippedNormalize = 0;
  let sectionsParsed = 0;
  let withImage = 0;
  let detailTimeouts = 0;
  /** Blitz side-events often omit the hotel address — copy from the main event. */
  const locationByKey = new Map<
    string,
    { zip: string; city: string; state: string; coords: { lat: number; lng: number } | null }
  >();

  function locationKey(raw: RawCca, detail?: CcaDetailEnrichment | null): string {
    return (detail?.titleName || raw.name)
      .toLowerCase()
      .replace(/\s+blitz\b.*$/i, "")
      .replace(/\bnew york\b/g, "ny")
      .replace(/\bchampionships?\b/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function findInherited(key: string) {
    const direct = locationByKey.get(key);
    if (direct) return direct;
    for (const [k, v] of locationByKey) {
      if (k.startsWith(key) || key.startsWith(k)) return v;
    }
    return undefined;
  }

  type DetailRow = {
    raw: RawCca;
    detail: CcaDetailEnrichment | null;
  };
  const enriched: DetailRow[] = [];

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]!;
    let detail: CcaDetailEnrichment | null = null;
    const hasRealDetail = !raw.detailUrl.includes("#coming-");

    if (!SKIP_DETAIL && hasRealDetail) {
      try {
        process.stdout.write(
          `\rDetail ${i + 1}/${raws.length}: ${raw.name.slice(0, 48).padEnd(48)}`
        );
        const page = await fetchHtml(raw.detailUrl);
        detail = parseCcaDetailHtml(page, raw.detailUrl);
        await sleep(DETAIL_DELAY_MS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/timed out/i.test(msg)) detailTimeouts += 1;
        console.warn(`\ndetail fetch failed for ${raw.detailUrl}: ${msg}`);
      }
    }

    enriched.push({ raw, detail });
  }
  if (!SKIP_DETAIL) process.stdout.write("\n");

  // Seed locations from any sibling that resolved a zip (main or blitz).
  for (const { raw, detail } of enriched) {
    if (detail?.zip && /^\d{5}$/.test(detail.zip)) {
      const key = locationKey(raw, detail);
      if (!locationByKey.has(key) || !raw.isBlitz) {
        locationByKey.set(key, {
          zip: detail.zip,
          city: detail.city ?? raw.city,
          state: detail.state ?? raw.state,
          coords: null,
        });
      }
    }
  }

  for (const { raw, detail: detailIn } of enriched) {
    let detail = detailIn;

    // Drop placeholder-only rows that never got a real date from detail.
    if (raw.dateText.includes("2099") && !detail?.dateText) {
      skippedNormalize += 1;
      continue;
    }

    const inherited = findInherited(locationKey(raw, detail));
    if (detail && inherited && (!detail.zip || raw.isBlitz)) {
      detail = {
        ...detail,
        zip: inherited.zip,
        city: detail.city ?? inherited.city,
        state: detail.state ?? inherited.state,
      };
    } else if (!detail && inherited && raw.isBlitz) {
      detail = {
        venueName: null,
        address: null,
        city: inherited.city,
        state: inherited.state,
        zip: inherited.zip,
        titleName: null,
        dateText: null,
        endDate: null,
        imageUrl: null,
        bodyText: null,
      };
    }

    let coords = await coordsForZip(detail?.zip ?? null);
    if (!coords && inherited) {
      if (!inherited.coords && inherited.zip) {
        inherited.coords = await coordsForZip(inherited.zip);
      }
      coords = inherited.coords;
    }
    if (inherited && coords) inherited.coords = coords;

    const row = normalizeRawCca(raw, { id: randomUUID(), detail, coords });
    if (!row) {
      skippedNormalize += 1;
      continue;
    }
    if (row.sections.length > 0) sectionsParsed += 1;
    const imageUrl = row.competition.image_url || fallbackImage;
    if (imageUrl) withImage += 1;
    drafts.push({
      ...row.competition,
      image_url: imageUrl,
      sections: row.sections,
    });
  }

  console.log(
    `Normalized ${drafts.length} rows (skipped normalize=${skippedNormalize}` +
      (detailTimeouts ? `, detail timeouts=${detailTimeouts}` : "") +
      `).`
  );
  console.log(
    `  sections parsed on ${sectionsParsed}/${drafts.length} events ` +
      `(others get Open fallback).`
  );
  console.log(`  images: ${withImage}/${drafts.length} (CCA pages rarely have covers)`);
  console.log(
    `  published: ${drafts.filter((d) => d.status === "published").length}`
  );
  console.log(`  draft: ${drafts.filter((d) => d.status === "draft").length}`);

  stageCompetitions(STAGING_FILE, drafts);

  if (!client) {
    const msg = "No Supabase configured — staging file is the output.";
    if (process.env.REQUIRE_SUPABASE === "1" || process.env.CI === "true") {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    return;
  }

  await persistScrapeBatch(client, drafts, CCA_SCRAPER_ID, {
    scrapeRunSource: "cca_scrape",
    meta: { listing: CCA_LISTING_URL },
  });
  console.log("Done. Rows tagged source='cca_scrape' with CCA source_url.");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
