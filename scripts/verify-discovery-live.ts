import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { loadDotEnv } from "../ingestion/persist";
import { todayIsoDate } from "../lib/competition-timing";

const REVIEWED_SOURCES = [
  "taea_vase_scrape",
  "afsa_essay_scrape",
  "uil_theatre_scrape",
  "uil_speech_debate_scrape",
  "purple_comet_scrape",
  "uil_music_marching_scrape",
  "txsef_scrape",
  "congressional_app_challenge_scrape",
] as const;

type LiveRow = {
  source: string;
  category: string;
  status: string;
  start_date: string;
  end_date: string | null;
  canonical_id: string | null;
  rated: boolean;
  rating_system: string | null;
  series_id: string | null;
  pathway_status: string;
  pathway_summary: string | null;
  pathway_related: unknown;
};

function ended(row: Pick<LiveRow, "start_date" | "end_date">, today: string) {
  return (row.end_date ?? row.start_date) < today;
}

async function main() {
  loadDotEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client
    .from("competitions")
    .select(
      "source, category, status, start_date, end_date, canonical_id, rated, rating_system, series_id, pathway_status, pathway_summary, pathway_related"
    )
    .in("source", [...REVIEWED_SOURCES]);
  if (error) throw new Error(`Discovery verification query failed: ${error.message}`);

  const rows = (data ?? []) as LiveRow[];
  const today = todayIsoDate();
  let failed = false;
  for (const source of REVIEWED_SOURCES) {
    const sourceRows = rows.filter((row) => row.source === source);
    const published = sourceRows.filter(
      (row) => row.status === "published" && !row.canonical_id
    );
    const upcoming = published.filter((row) => !ended(row, today));
    const endedRows = published.filter((row) => ended(row, today));
    const drafts = sourceRows.filter((row) => row.status === "draft");
    console.log(
      `${source}: total=${sourceRows.length} published=${published.length} upcoming=${upcoming.length} ended=${endedRows.length} drafts=${drafts.length}`
    );
    if (sourceRows.length === 0) failed = true;
  }

  const isolationViolations = rows.filter(
    (row) =>
      row.category !== "chess" &&
      (row.rated ||
        row.rating_system !== null ||
        row.series_id !== null ||
        row.pathway_status !== "none" ||
        row.pathway_summary !== null ||
        (Array.isArray(row.pathway_related) && row.pathway_related.length > 0))
  );
  console.log(`non_chess_pathway_violations=${isolationViolations.length}`);
  if (isolationViolations.length > 0) failed = true;

  const { count: tabroomCount, error: tabroomError } = await client
    .from("competitions")
    .select("id", { count: "exact", head: true })
    .eq("source", "tabroom_scrape")
    .neq("status", "archived");
  if (tabroomError) {
    throw new Error(`Tabroom verification failed: ${tabroomError.message}`);
  }
  console.log(`tabroom_primary_unarchived=${tabroomCount ?? 0}`);
  if ((tabroomCount ?? 0) !== 0) failed = true;

  for (const category of ["debate", "stem", "arts", "writing"] as const) {
    const categoryRows = rows.filter(
      (row) =>
        row.category === category &&
        row.status === "published" &&
        !row.canonical_id
    );
    console.log(
      `category=${category} upcoming=${categoryRows.filter((row) => !ended(row, today)).length} all=${categoryRows.length}`
    );
  }

  if (failed) {
    throw new Error("Live discovery verification failed.");
  }
  console.log("Live discovery verification passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
