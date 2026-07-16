/**
 * US Chess TLA (Tournament Life Announcements) scraper — the primary supply
 * feed. There is no API; this parses the public HTML listing.
 *
 * Runs ONLY via `npm run scrape:tla` or the (disabled) GitHub Actions cron —
 * never during build or dev. Output is staged, never published directly:
 *   - Supabase configured → inserts competitions with status='draft'
 *   - otherwise           → writes data/staging/tla-drafts.json
 * A human reviews drafts (enrich zip/coords/fee, add sections) and flips
 * status to 'published'. See ingestion/README.md.
 *
 * TODO: verify selectors against the live US Chess TLA page before first
 * real run — the markup changes periodically and this was coded to the best
 * known structure (a Drupal views table), defensively.
 */
import { load } from "cheerio";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getServiceRoleClient } from "../lib/supabase/client";
import { normalizeRawTla, RawTlaSchema, type RawTla } from "./normalize";

// Load .env for plain-script runs (Next does this itself, tsx doesn't).
try {
  for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env — fine */
}

const TLA_URL = "https://new.uschess.org/tournaments";

async function fetchListing(): Promise<string> {
  const res = await fetch(TLA_URL, {
    headers: {
      // Identify ourselves honestly; this is a public listing.
      "User-Agent": "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)",
    },
  });
  if (!res.ok) {
    throw new Error(`TLA fetch failed: HTTP ${res.status} from ${TLA_URL}`);
  }
  return res.text();
}

function parseListing(html: string): RawTla[] {
  const $ = load(html);
  const raws: RawTla[] = [];

  // TODO: verify selectors against live page. Coded against the Drupal
  // "views" table US Chess has used: one <tr> per event with date, linked
  // name, and location cells. Every access below is defensive — a missing
  // cell skips the row instead of throwing.
  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const dateText = $(cells[0]).text().trim();
    const link = $(cells[1]).find("a").first();
    const name = (link.text() || $(cells[1]).text()).trim();
    const href = link.attr("href");
    const locationText = $(cells[2]).text().trim();

    // "City, ST" (tolerate extra venue text before the city)
    const loc = locationText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/);
    if (!name || !href || !loc || !dateText) return;

    const detailUrl = href.startsWith("http") ? href : new URL(href, TLA_URL).toString();
    const candidate = {
      name,
      dateText,
      city: loc[1].trim(),
      state: loc[2],
      detailUrl,
    };
    const parsed = RawTlaSchema.safeParse(candidate);
    if (parsed.success) raws.push(parsed.data);
    else console.warn(`skipping row (failed validation): ${JSON.stringify(candidate)}`);
  });

  return raws;
}

async function main() {
  console.log(`Fetching ${TLA_URL} …`);
  const html = await fetchListing();
  const raws = parseListing(html);
  console.log(`Parsed ${raws.length} raw TLA rows.`);
  if (raws.length === 0) {
    console.error(
      "0 rows parsed — the page structure has probably changed. " +
        "Inspect the live page and fix the selectors in ingestion/scrape-tla.ts."
    );
    process.exit(1);
  }

  const drafts = raws
    .map((raw) => normalizeRawTla(raw, randomUUID()))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  console.log(`Normalized ${drafts.length} drafts (${raws.length - drafts.length} skipped).`);

  const client = getServiceRoleClient();
  if (client) {
    // Stage into the competitions table as drafts; ignore slugs we already
    // have so re-runs don't duplicate.
    const { error } = await client
      .from("competitions")
      .upsert(drafts as never[], { onConflict: "slug", ignoreDuplicates: true });
    if (error) throw new Error(`Supabase staging insert failed: ${error.message}`);
    console.log(`Staged ${drafts.length} drafts in Supabase (status='draft').`);
  } else {
    const outDir = join(process.cwd(), "data", "staging");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "tla-drafts.json");
    writeFileSync(outPath, JSON.stringify(drafts, null, 2) + "\n");
    console.log(`No Supabase configured — wrote ${drafts.length} drafts to ${outPath}.`);
  }
  console.log("Next: human review → enrich zip/coords/fee/sections → flip status to 'published'.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
