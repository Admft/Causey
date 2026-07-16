/**
 * Shared scrape persistence: stage to disk before upsert so a failed DB write
 * never forces a full re-scrape. Use SCRAPE_UPSERT_ONLY=1 with the staging file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competition } from "../lib/schemas";

export function loadDotEnv(): void {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env */
  }
}

export function stageCompetitions(filename: string, rows: Competition[]): string {
  const outDir = join(process.cwd(), "data", "staging");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");
  console.log(`Staged ${rows.length} rows → ${outPath}`);
  return outPath;
}

export function loadStagedCompetitions(filename: string): Competition[] {
  const path = join(process.cwd(), "data", "staging", filename);
  return JSON.parse(readFileSync(path, "utf8")) as Competition[];
}

export async function upsertCompetitions(
  client: SupabaseClient,
  drafts: Competition[],
  source: Competition["source"]
): Promise<number> {
  const { data: existing, error: existingErr } = await client
    .from("competitions")
    .select("id, slug")
    .eq("source", source);
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
        "competitions.source_url missing — run supabase/migrations/0002_source_url.sql. " +
          "Upserting without source_url for now."
      );
      const stripped = chunk.map(({ source_url: _drop, ...rest }) => rest);
      ({ error } = await client
        .from("competitions")
        .upsert(stripped as never[], { onConflict: "slug" }));
    }

    if (error?.message?.includes("cca_scrape") || error?.message?.includes("check constraint")) {
      throw new Error(
        `${error.message}\n` +
          "Run supabase/migrations/0003_cca_source.sql in the Supabase SQL editor, then retry with:\n" +
          "  SCRAPE_UPSERT_ONLY=1 npm run scrape:cca"
      );
    }

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted}/${payload.length}`);
  }
  console.log(`\nUpserted ${upserted} competitions (source='${source}').`);
  return upserted;
}
