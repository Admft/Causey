import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CompetitionSchema,
  type CompetitionCategory,
} from "../lib/schemas";

type ReviewSource = {
  source: string;
  category: CompetitionCategory;
  file: string;
};

const REVIEW_SOURCES: readonly ReviewSource[] = [
  {
    source: "taea_vase_scrape",
    category: "arts",
    file: "taea-vase-drafts.json",
  },
  {
    source: "afsa_essay_scrape",
    category: "writing",
    file: "afsa-essay-drafts.json",
  },
  {
    source: "uil_theatre_scrape",
    category: "arts",
    file: "uil-theatre-drafts.json",
  },
  {
    source: "uil_speech_debate_scrape",
    category: "debate",
    file: "uil-speech-debate-drafts.json",
  },
  {
    source: "purple_comet_scrape",
    category: "stem",
    file: "purple-comet-drafts.json",
  },
  {
    source: "uil_music_marching_scrape",
    category: "arts",
    file: "uil-music-marching-drafts.json",
  },
  {
    source: "txsef_scrape",
    category: "stem",
    file: "txsef-drafts.json",
  },
] as const;

export type StageReviewSummary = {
  source: string;
  rows: number;
  publishable: number;
  drafts: number;
  ended: number;
  invalid: number;
  issues: string[];
};

function effectiveEnd(row: {
  start_date: string;
  end_date: string | null;
}): string {
  return row.end_date ?? row.start_date;
}

export function reviewStagedRows(
  expected: Pick<ReviewSource, "source" | "category">,
  rows: unknown[],
  asOf = new Date().toISOString().slice(0, 10)
): StageReviewSummary {
  let publishable = 0;
  let drafts = 0;
  let ended = 0;
  const issues: string[] = [];

  for (const [index, raw] of rows.entries()) {
    const parsed = CompetitionSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push(
        `row ${index + 1}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`
      );
      continue;
    }
    const row = parsed.data;
    const staged = raw as {
      external_key?: unknown;
      details?: Record<string, unknown>;
    };
    if (row.source !== expected.source) {
      issues.push(`row ${index + 1}: source does not match ${expected.source}`);
    }
    if (row.category !== expected.category) {
      issues.push(`row ${index + 1}: category does not match ${expected.category}`);
    }
    if (
      typeof staged.external_key !== "string" ||
      !staged.external_key.trim()
    ) {
      issues.push(`row ${index + 1}: source-native external_key is missing`);
    }
    if (!row.source_url?.startsWith("https://")) {
      issues.push(`row ${index + 1}: canonical HTTPS source_url is missing`);
    }
    if (!row.details.facets?.length) {
      issues.push(`row ${index + 1}: normalized category facet is missing`);
    }
    if (!row.details.source_fetched_at) {
      issues.push(`row ${index + 1}: source freshness timestamp is missing`);
    }
    if (row.status === "published") publishable += 1;
    else if (row.status === "draft") drafts += 1;
    else {
      issues.push(`row ${index + 1}: status ${row.status} is not publishable`);
    }
    if (effectiveEnd(row) < asOf) ended += 1;
  }

  return {
    source: expected.source,
    rows: rows.length,
    publishable,
    drafts,
    ended,
    invalid: issues.length,
    issues,
  };
}

function loadRows(file: string): unknown[] {
  const path = join(process.cwd(), "data", "staging", file);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file} is not a row array.`);
  return parsed;
}

async function main() {
  let failed = false;
  for (const source of REVIEW_SOURCES) {
    const rows = loadRows(source.file);
    const summary = reviewStagedRows(source, rows);
    console.log(
      `${summary.source}: rows=${summary.rows} publishable=${summary.publishable} drafts=${summary.drafts} ended=${summary.ended} issues=${summary.invalid}`
    );
    if (process.env.STAGE_REVIEW_VERBOSE === "1") {
      for (const raw of rows) {
        const parsed = CompetitionSchema.safeParse(raw);
        if (!parsed.success) continue;
        const row = parsed.data;
        console.log(
          `  ${row.start_date}${row.end_date ? `..${row.end_date}` : ""} | ${row.status} | ${row.name} | ${row.source_url}`
        );
      }
    }
    for (const issue of summary.issues) console.error(`  - ${issue}`);
    if (summary.invalid > 0) failed = true;
  }
  if (failed) {
    console.error("Stage review failed; do not upsert or publish these files.");
    process.exit(1);
  }
  console.log("Stage review passed the good-listing contract.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
