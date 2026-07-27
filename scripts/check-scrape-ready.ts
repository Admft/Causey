/**
 * Fail fast if Supabase is missing migrations / zip seed / series seed.
 * Run before a full scrape:
 *
 *   npm run scrape:preflight
 */
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  } catch {
    /* no .env */
  }
}

type Check = { ok: boolean; label: string; detail?: string };

async function main() {
  loadDotEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checks: Check[] = [];

  if (!url || !key) {
    console.error("FAIL: Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }
  checks.push({ ok: true, label: "Supabase env vars" });

  const client = createClient(url, key, { auth: { persistSession: false } });

  async function probe(
    label: string,
    fn: () => Promise<{ error: { message: string } | null; count?: number | null }>
  ) {
    const { error, count } = await fn();
    if (error) checks.push({ ok: false, label, detail: error.message });
    else checks.push({ ok: true, label, detail: count != null ? `count=${count}` : undefined });
  }

  await probe("zips table seeded", async () => {
    const r = await client.from("zips").select("zip", { count: "exact", head: true });
    if (!r.error && (r.count ?? 0) < 1000) {
      return {
        error: {
          message: `only ${r.count} zips — run npm run seed:zips (need full US set for publish)`,
        },
        count: r.count,
      };
    }
    return r;
  });

  await probe("series seeded", async () => {
    const r = await client.from("series").select("id", { count: "exact", head: true });
    if (!r.error && (r.count ?? 0) < 1) {
      return { error: { message: "no series — run npm run seed:supabase" }, count: 0 };
    }
    return r;
  });

  await probe("competitions.source_url (0002)", async () =>
    client.from("competitions").select("source_url").limit(1)
  );
  await probe("cca_scrape source allowed (0003)", async () => {
    const r = await client.from("competitions").select("source").eq("source", "cca_scrape").limit(1);
    return r;
  });
  await probe("fingerprint column (0005)", async () =>
    client.from("competitions").select("fingerprint").limit(1)
  );
  await probe("scrape_runs table (0005)", async () =>
    client.from("scrape_runs").select("id").limit(1)
  );
  await probe("competition_sources table (0005)", async () =>
    client.from("competition_sources").select("id").limit(1)
  );
  await probe("image_url column (0006)", async () =>
    client.from("competitions").select("image_url").limit(1)
  );
  await probe("pathway_status column (0007)", async () =>
    client.from("competitions").select("pathway_status").limit(1)
  );
  await probe("enrichment_runs table (0007)", async () =>
    client.from("enrichment_runs").select("id").limit(1)
  );

  // Nullable fee (0008): try selecting is enough; nullability checked on upsert.
  await probe("entry_fee_cents readable (0008)", async () =>
    client.from("competitions").select("entry_fee_cents").limit(1)
  );

  if (process.env.OPENAI_API_KEY) {
    checks.push({ ok: true, label: "OPENAI_API_KEY (pathway enrich)" });
  } else {
    checks.push({
      ok: true,
      label: "OPENAI_API_KEY missing (optional)",
      detail: "pathway enrich will stay heuristic-only",
    });
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "OK  " : "FAIL";
    console.log(`${mark}  ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
    if (!c.ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Apply pending SQL in the Supabase SQL editor:`);
    console.error("  supabase/migrations/0005_ingestion_ops.sql");
    console.error("  supabase/migrations/0006_competition_image_url.sql");
    console.error("  supabase/migrations/0007_pathway_enrichment.sql");
    console.error("  supabase/migrations/0008_nullable_entry_fee.sql");
    console.error("Or paste: supabase/migrations/PENDING_SCRAPE.sql");
    process.exit(1);
  }

  console.log("\nScrape preflight passed — safe to run npm run scrape:all");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
