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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import type { Competition } from "../lib/schemas";
import {
  normalizeRawTla,
  SCRAPER_SITE,
  type DetailEnrichment,
  type RawTla,
} from "./normalize";
import {
  LISTING_URL,
  maxPagerPage,
  parseDetailHtml,
  parseListingHtml,
} from "./parse-uschess";

try {
  for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env — fine */
}

const USER_AGENT = "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)";
const DETAIL_DELAY_MS = 350;
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? "40");
const SKIP_DETAIL = process.env.SCRAPE_SKIP_DETAIL === "1";

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
    const outPath = join(process.cwd(), "data", "staging", "tla-drafts.json");
    const drafts = JSON.parse(readFileSync(outPath, "utf8")) as Competition[];
    console.log(`Upsert-only mode: loading ${drafts.length} rows from ${outPath}`);
    const client = getServiceRoleClient();
    if (!client) {
      console.error("Need Supabase env vars for upsert-only.");
      process.exit(1);
    }
    await upsertDrafts(client, drafts);
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

  const drafts: Competition[] = [];
  let skippedOnline = 0;
  let skippedNormalize = 0;

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]!;
    let detail: DetailEnrichment | null = null;
    if (!SKIP_DETAIL) {
      try {
        process.stdout.write(
          `\rDetail ${i + 1}/${raws.length}: ${raw.name.slice(0, 48).padEnd(48)}`
        );
        const html = await fetchHtml(raw.detailUrl);
        detail = parseDetailHtml(html);
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
    drafts.push(row);
  }
  if (!SKIP_DETAIL) process.stdout.write("\n");

  console.log(
    `Normalized ${drafts.length} rows ` +
      `(skipped online=${skippedOnline}, normalize=${skippedNormalize}).`
  );
  const published = drafts.filter((d) => d.status === "published").length;
  console.log(`  ready to show (published): ${published}`);
  console.log(`  needs location review (draft): ${drafts.length - published}`);

  // Always stage to disk before DB write — a failed upsert must not burn a full re-scrape.
  const outDir = join(process.cwd(), "data", "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "tla-drafts.json");
  writeFileSync(outPath, JSON.stringify(drafts, null, 2) + "\n");
  console.log(`Staged ${drafts.length} rows → ${outPath}`);

  if (!client) {
    console.log("No Supabase configured — staging file is the output. Set .env to upsert.");
    console.log(
      "Done. Every row has source='tla_scrape' and source_url set to its US Chess page."
    );
    return;
  }

  await upsertDrafts(client, drafts);
  console.log(
    "Done. Every row has source='tla_scrape' and source_url set to its US Chess page."
  );
}

async function upsertDrafts(
  client: NonNullable<ReturnType<typeof getServiceRoleClient>>,
  drafts: Competition[]
) {
  const { data: existing, error: existingErr } = await client
    .from("competitions")
    .select("id, slug")
    .eq("source", "tla_scrape");
  if (existingErr) throw new Error(`lookup existing failed: ${existingErr.message}`);
  const idBySlug = new Map(
    (existing ?? []).map((r) => [r.slug as string, r.id as string])
  );

  const bySlug = new Map<string, Competition>();
  for (const d of drafts) bySlug.set(d.slug, d);
  if (bySlug.size < drafts.length) {
    console.warn(
      `Deduped ${drafts.length - bySlug.size} in-batch slug collisions before upsert.`
    );
  }

  const payload = [...bySlug.values()].map((d) => ({
    ...d,
    id: idBySlug.get(d.slug) ?? d.id,
  }));

  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH);
    let { error } = await client
      .from("competitions")
      .upsert(chunk as never[], { onConflict: "slug" });

    if (error?.message?.includes("source_url")) {
      console.warn(
        "competitions.source_url missing — run supabase/migrations/0002_source_url.sql, then re-scrape. " +
          "Upserting without source_url for now (source='tla_scrape' + reg_url still identify origin)."
      );
      const stripped = chunk.map(({ source_url: _drop, ...rest }) => rest);
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted}/${payload.length}`);
  }
  console.log(`\nUpserted ${upserted} competitions (source='tla_scrape').`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
