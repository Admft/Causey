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
  await probe("competition_sources provenance fields (0005)", async () =>
    client
      .from("competition_sources")
      .select("id, competition_id, source, external_key, source_url, last_seen_at")
      .limit(1)
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
  await probe("organization/visibility fields (0010+)", async () =>
    client
      .from("competitions")
      .select("visibility, audience, org_id, created_by, details")
      .limit(1)
  );
  await probe("hub scrape sources readable (0019, 0032)", async () =>
    client
      .from("competitions")
      .select("source")
      .in("source", [
        "tla_scrape",
        "cca_scrape",
        "onlinereg_scrape",
        "chess_results_scrape",
        "fide_calendar_scrape",
        "tca_scrape",
      ])
      .limit(1)
  );
  await probe("multi-category competition fields (0041)", async () =>
    client
      .from("competitions")
      .select("category, custom_category_name, participation_mode")
      .limit(1)
  );
  await probe("multi-category ingest sources (0055)", async () => {
    const r = await client
      .from("ingestion_sources")
      .select("id, category", { count: "exact", head: true })
      .in("id", [
        "tabroom_scrape",
        "vex_events_scrape",
        "taea_vase_scrape",
        "bennington_writers_scrape",
        "doe_science_bowl_scrape",
        "afsa_essay_scrape",
        "uil_theatre_scrape",
        "uil_speech_debate_scrape",
        "purple_comet_scrape",
        "uil_music_marching_scrape",
        "txsef_scrape",
        "congressional_app_challenge_scrape",
        "hack_club_hackathons_scrape",
      ]);
    if (!r.error && r.count !== 13) {
      return {
        error: {
          message: `found ${r.count ?? 0}/13 category sources — apply migrations through 0085`,
        },
        count: r.count,
      };
    }
    return r;
  });
  await probe("Congressional App Challenge source (0083)", async () =>
    client
      .from("ingestion_sources")
      .select("id, category")
      .eq("id", "congressional_app_challenge_scrape")
      .limit(1)
  );
  await probe("Hack Club Hackathons source (0085)", async () =>
    client
      .from("ingestion_sources")
      .select("id, category")
      .eq("id", "hack_club_hackathons_scrape")
      .limit(1)
  );
  await probe("Tabroom automation pause (0051)", async () => {
    const r = await client
      .from("ingestion_sources")
      .select("id", { count: "exact", head: true })
      .eq("id", "tabroom_scrape")
      .eq("status", "soon");
    if (!r.error && r.count !== 1) {
      return {
        error: {
          message: "Tabroom source is not paused — apply migration 0051",
        },
        count: r.count,
      };
    }
    return r;
  });
  await probe("Tabroom primary listings archived (0051)", async () => {
    const r = await client
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("source", "tabroom_scrape")
      .neq("status", "archived");
    if (!r.error && r.count !== 0) {
      return {
        error: {
          message: `found ${r.count ?? 0} non-archived primary Tabroom listings — apply migration 0051`,
        },
        count: r.count,
      };
    }
    return r;
  });
  await probe("profile category shortcut contract (0056)", async () =>
    client
      .from("profiles")
      .select("preferred_competition_category")
      .limit(1)
  );
  await probe("section replacement fields (0041)", async () =>
    client
      .from("sections")
      .select(
        "id, competition_id, name, min_rating, max_rating, min_grade, max_grade, entry_fee_cents"
      )
      .limit(1)
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
    console.error(
      `\n${failed} check(s) failed. Apply the repository's ordered migrations through the current head (0057), preferably with:`
    );
    console.error("  supabase db push");
    console.error(
      "Do not use PENDING_SCRAPE.sql; it is an obsolete partial schema snapshot."
    );
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
