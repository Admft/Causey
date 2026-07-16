/**
 * Load the full US zip → lat/lng dataset into Supabase `zips`.
 *
 * Source: GeoNames US postal-code dump
 *   https://download.geonames.org/export/zip/US.zip
 *
 * Run: npm run seed:zips
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
 * Idempotent: upserts on `zip` primary key.
 */
import { execFileSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { getServiceRoleClient } from "../lib/supabase/client";

const GEONAMES_URL = "https://download.geonames.org/export/zip/US.zip";
const BATCH_SIZE = 1000;

try {
  const env = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env — rely on shell */
}

type ZipRow = { zip: string; lat: number; lng: number };

async function downloadZip(dest: string): Promise<void> {
  console.log(`Downloading ${GEONAMES_URL} …`);
  const res = await fetch(GEONAMES_URL);
  if (!res.ok || !res.body) {
    throw new Error(`GeoNames download failed: HTTP ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
  console.log(`Saved ${dest}`);
}

function extractUsTxt(zipPath: string, outPath: string): void {
  // macOS/Linux unzip is enough — avoid a zip dependency for a one-shot load.
  const txt = execFileSync("unzip", ["-p", zipPath, "US.txt"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(outPath, txt);
  console.log(`Extracted ${outPath}`);
}

/**
 * GeoNames postal format (tab-separated):
 * country, postal, place, admin1name, admin1, admin2name, admin2,
 * admin3name, admin3, lat, lng, accuracy
 *
 * Some zips appear more than once (different place names). Keep the first
 * centroid per zip — good enough for radius search origins.
 */
function parseGeoNames(txt: string): ZipRow[] {
  const byZip = new Map<string, ZipRow>();
  for (const line of txt.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length < 11) continue;
    const zip = cols[1]?.trim();
    const lat = Number(cols[9]);
    const lng = Number(cols[10]);
    if (!/^\d{5}$/.test(zip)) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!byZip.has(zip)) byZip.set(zip, { zip, lat, lng });
  }
  return [...byZip.values()].sort((a, b) => a.zip.localeCompare(b.zip));
}

async function main() {
  const client = getServiceRoleClient();
  if (!client) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env first."
    );
    process.exit(1);
  }

  const stagingDir = join(process.cwd(), "data", "staging");
  mkdirSync(stagingDir, { recursive: true });
  const zipPath = join(stagingDir, "geonames-US.zip");
  const txtPath = join(stagingDir, "geonames-US.txt");

  if (!existsSync(txtPath)) {
    await downloadZip(zipPath);
    extractUsTxt(zipPath, txtPath);
    try {
      unlinkSync(zipPath);
    } catch {
      /* keep zip if unlink fails */
    }
  } else {
    console.log(`Reusing cached ${txtPath}`);
  }

  const rows = parseGeoNames(readFileSync(txtPath, "utf8"));
  console.log(`Parsed ${rows.length} unique 5-digit US zips.`);
  if (rows.length < 30000) {
    throw new Error(
      `Expected ~40k+ zips, got ${rows.length}. GeoNames format may have changed.`
    );
  }

  let loaded = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client.from("zips").upsert(batch, { onConflict: "zip" });
    if (error) {
      throw new Error(`Upsert failed at offset ${i}: ${error.message}`);
    }
    loaded += batch.length;
    process.stdout.write(`\rUpserted ${loaded}/${rows.length}`);
  }
  console.log("\nDone. Full US zip lookup is live in Supabase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
