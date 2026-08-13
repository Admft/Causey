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
import { pathToFileURL } from "node:url";
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

const load = (rel: string) =>
  JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));

export function assertSeedSafety(
  env: NodeJS.ProcessEnv,
  qualificationRules: Array<{ notes?: unknown }>
): void {
  const production =
    env.VERCEL_ENV === "production" ||
    env.NODE_ENV === "production" ||
    env.SEED_TARGET === "production";
  if (production && env.ALLOW_PRODUCTION_SEED !== "1") {
    throw new Error(
      "Refusing to seed a production target. Set ALLOW_PRODUCTION_SEED=1 after reviewing every seed file."
    );
  }

  const untagged = qualificationRules.filter(
    (rule) =>
      typeof rule.notes !== "string" ||
      !/\bSEED SCAFFOLDING\b/i.test(rule.notes)
  );
  if (untagged.length > 0) {
    throw new Error(
      `${untagged.length} qualification rule(s) lack the required SEED SCAFFOLDING illustrative tag.`
    );
  }
  if (
    production &&
    qualificationRules.length > 0 &&
    env.ALLOW_ILLUSTRATIVE_SEED !== "1"
  ) {
    throw new Error(
      "Qualification rules are illustrative scaffolding. Set ALLOW_ILLUSTRATIVE_SEED=1 only if that production write is intentional."
    );
  }
}

async function upsert(
  client: NonNullable<ReturnType<typeof getServiceRoleClient>>,
  table: string,
  rows: unknown[],
  conflict = "id"
) {
  const { error } = await client.from(table).upsert(rows as never[], {
    onConflict: conflict,
  });
  if (error) {
    console.error(`Failed seeding ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`seeded ${table}: ${rows.length} rows`);
}

async function main() {
  const client = getServiceRoleClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env from .env.example first."
    );
  }
  const qualificationRules = load("data/seed/qualification_rules.json") as Array<{
    notes?: unknown;
  }>;
  assertSeedSafety(process.env, qualificationRules);

  // Order matters: FKs point series ← competitions ← sections / rules.
  await upsert(client, "series", load("data/seed/series.json"));
  await upsert(client, "competitions", load("data/seed/competitions.json"));
  await upsert(client, "sections", load("data/seed/sections.json"));
  await upsert(client, "qualification_rules", qualificationRules);
  await upsert(client, "zips", load("data/zips.sample.json"), "zip");

  console.log("Done. Remember: seeded qualification_rules are scaffolding — see SETUP.md step 6.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
