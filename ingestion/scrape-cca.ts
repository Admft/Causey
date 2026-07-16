/**
 * Continental Chess Association scraper (chesstour.com/refs.html).
 *
 * Pipeline id: source = 'cca_scrape'
 * Provenance:   source_url = CCA event detail page (or refs.html#coming-… )
 * Registration: reg_url = https://www.chessaction.com/
 *
 * Resilience (same as TLA scraper):
 *   - Always writes data/staging/cca-drafts.json BEFORE upsert
 *   - SCRAPE_UPSERT_ONLY=1 reloads that file and upserts (no re-fetch)
 *   - SCRAPE_HTML_FILE=… parses a local listing fixture
 *   - SCRAPE_SKIP_DETAIL=1 skips detail enrichment
 *
 *   npm run scrape:cca
 *   SCRAPE_UPSERT_ONLY=1 npm run scrape:cca
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import type { Competition } from "../lib/schemas";
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
} from "./persist";

loadDotEnv();

const USER_AGENT = "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)";
const DETAIL_DELAY_MS = 300;
const SKIP_DETAIL = process.env.SCRAPE_SKIP_DETAIL === "1";
const INCLUDE_COMING = process.env.SCRAPE_CCA_COMING !== "0";
const STAGING_FILE = "cca-drafts.json";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} from ${url}`);
  return res.text();
}

function loadListing(): { html: string; raws: RawCca[] } {
  const fixture = process.env.SCRAPE_HTML_FILE;
  let html: string;
  if (fixture) {
    const path = fixture.startsWith("/") ? fixture : join(process.cwd(), fixture);
    console.log(`Using local fixture: ${path}`);
    html = readFileSync(path, "utf8");
  } else {
    throw new Error("INTERNAL: loadListing called without html — fetch first");
  }
  const linked = parseCcaListingHtml(html);
  const coming = INCLUDE_COMING ? parseCcaComingEvents(html) : [];
  // Prefer detail-linked events; add coming-only rows whose names aren't covered.
  const linkedNames = new Set(linked.map((r) => r.name.toLowerCase()));
  const extras = coming.filter((c) => {
    const n = c.name.toLowerCase();
    for (const existing of linkedNames) {
      if (existing.includes(n) || n.includes(existing.replace(/ blitz$/, ""))) return false;
    }
    return true;
  });
  return { html, raws: [...linked, ...extras] };
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
    html = readFileSync(path, "utf8");
  } else {
    console.log(`Fetching ${CCA_LISTING_URL}`);
    html = await fetchHtml(CCA_LISTING_URL);
  }

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
    // Skip near-term events already on the main schedule block
    return true;
  });

  const raws = [...linked, ...extras];
  console.log(
    `Parsed ${linked.length} linked events + ${extras.length} coming-soon lines = ${raws.length} total.`
  );
  if (raws.length === 0) {
    console.error("0 CCA rows parsed — check selectors / fixture.");
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

  const drafts: Competition[] = [];
  let skippedNormalize = 0;

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
        detail = parseCcaDetailHtml(page);
        await sleep(DETAIL_DELAY_MS);
      } catch (err) {
        console.warn(`\ndetail fetch failed for ${raw.detailUrl}:`, err);
      }
    }

    // Drop placeholder-only rows that never got a real date from detail.
    if (raw.dateText.includes("2099") && !detail?.dateText) {
      skippedNormalize += 1;
      continue;
    }

    const coords = await coordsForZip(detail?.zip ?? null);
    const row = normalizeRawCca(raw, { id: randomUUID(), detail, coords });
    if (!row) {
      skippedNormalize += 1;
      continue;
    }
    drafts.push(row);
  }
  if (!SKIP_DETAIL) process.stdout.write("\n");

  console.log(
    `Normalized ${drafts.length} rows (skipped normalize=${skippedNormalize}).`
  );
  console.log(
    `  published: ${drafts.filter((d) => d.status === "published").length}`
  );
  console.log(`  draft: ${drafts.filter((d) => d.status === "draft").length}`);

  stageCompetitions(STAGING_FILE, drafts);

  if (!client) {
    console.log("No Supabase configured — staging file is the output.");
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
