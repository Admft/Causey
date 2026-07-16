/**
 * Loads /data/seed/*.json and /data/zips.sample.json into Supabase.
 * Run with: npm run seed:supabase
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * (service role bypasses RLS for writes). Idempotent: upserts on primary key,
 * so re-running after editing seed data is safe.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getServiceRoleClient } from "../lib/supabase/client";

// Next.js loads .env automatically; plain tsx scripts don't. Keep it minimal.
try {
  const env = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // no .env — rely on the shell environment
}

const client = getServiceRoleClient();
if (!client) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env from .env.example first."
  );
  process.exit(1);
}

const load = (rel: string) =>
  JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));

async function upsert(table: string, rows: unknown[], conflict = "id") {
  const { error } = await client!.from(table).upsert(rows as never[], {
    onConflict: conflict,
  });
  if (error) {
    console.error(`Failed seeding ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`seeded ${table}: ${rows.length} rows`);
}

// Order matters: FKs point series ← competitions ← sections / rules.
await upsert("series", load("data/seed/series.json"));
await upsert("competitions", load("data/seed/competitions.json"));
await upsert("sections", load("data/seed/sections.json"));
await upsert("qualification_rules", load("data/seed/qualification_rules.json"));
await upsert("zips", load("data/zips.sample.json"), "zip");

console.log("Done. Remember: seeded qualification_rules are scaffolding — see SETUP.md step 6.");
