/**
 * Shared scrape runner helpers for hub scrapers (FIDE / Chess-Results / OnlineReg).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Competition } from "../lib/schemas";
import { getServiceRoleClient } from "../lib/supabase/client";
import { decodeHtmlBuffer, fetchHtml } from "./fetch-html";
import {
  loadDotEnv,
  loadStagedCompetitions,
  loadStagingMetadata,
  persistScrapeBatch,
  stageCompetitions,
  type StagedCompetition,
} from "./persist";
import type { ScrapeRunSource } from "./scrape-run";

loadDotEnv();

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadFixtureHtml(relOrAbs: string): string {
  const path = relOrAbs.startsWith("/") ? relOrAbs : join(process.cwd(), relOrAbs);
  console.log(`Using local fixture: ${path}`);
  return decodeHtmlBuffer(readFileSync(path));
}

export async function loadListingHtml(opts: {
  fixtureEnv?: string;
  url: string;
}): Promise<string> {
  const fixture = process.env.SCRAPE_HTML_FILE ?? opts.fixtureEnv;
  if (fixture) return loadFixtureHtml(fixture);
  return fetchHtml(opts.url);
}

function asScrapeRunSource(source: Competition["source"]): ScrapeRunSource {
  if (
    source === "tla_scrape" ||
    source === "cca_scrape" ||
    source === "onlinereg_scrape" ||
    source === "chess_results_scrape" ||
    source === "fide_calendar_scrape" ||
    source === "tca_scrape" ||
    source === "tabroom_scrape" ||
    source === "vex_events_scrape" ||
    source === "taea_vase_scrape" ||
    source === "bennington_writers_scrape"
  ) {
    return source;
  }
  return "all";
}

export async function upsertOrExit(
  drafts: StagedCompetition[],
  source: Competition["source"],
  stagingFile: string,
  meta: Record<string, unknown>
) {
  const parsedCount = typeof meta.parsed === "number" ? meta.parsed : drafts.length;
  const completeSourceSnapshot =
    !process.env.SCRAPE_HTML_FILE &&
    !process.env.SCRAPE_MAX_EVENTS &&
    parsedCount === drafts.length;
  console.log(`Staging ${drafts.length} rows → data/staging/${stagingFile}`);
  stageCompetitions(stagingFile, drafts, { completeSourceSnapshot });

  if (process.env.SCRAPE_STAGE_ONLY === "1") {
    console.log("Stage-only mode — no database writes.");
    return;
  }

  const client = getServiceRoleClient();
  if (!client) {
    console.warn("No Supabase service role — staged only (set env to upsert).");
    return;
  }
  try {
    await persistScrapeBatch(client, drafts, source, {
      scrapeRunSource: asScrapeRunSource(source),
      meta,
      completeSourceSnapshot:
        completeSourceSnapshot &&
        process.env.SCRAPE_COMPLETE_SNAPSHOT !== "0",
    });
  } catch (err) {
    // Staging already succeeded — common when local DB lags migrations.
    console.error(
      "Upsert failed after staging:",
      err instanceof Error ? err.message : err
    );
    console.warn(
      `Drafts remain in data/staging/${stagingFile}. Apply pending migrations (esp. 0019) then SCRAPE_UPSERT_ONLY=1.`
    );
    process.exitCode = 1;
  }
}

export async function runUpsertOnly(
  stagingFile: string,
  source: Competition["source"]
) {
  const drafts = loadStagedCompetitions(stagingFile);
  const staging = loadStagingMetadata(stagingFile);
  console.log(`Upsert-only mode: ${drafts.length} rows from data/staging/${stagingFile}`);
  const client = getServiceRoleClient();
  if (!client) {
    console.error("Need Supabase env vars for upsert-only.");
    process.exit(1);
  }
  await persistScrapeBatch(client, drafts, source, {
    scrapeRunSource: asScrapeRunSource(source),
    meta: { mode: "upsert_only" },
    completeSourceSnapshot:
      process.env.SCRAPE_COMPLETE_SNAPSHOT === "1" &&
      staging?.completeSourceSnapshot === true &&
      staging.rowCount === drafts.length,
  });
}

export function newId() {
  return randomUUID();
}

export function capRows<T>(rows: T[]): T[] {
  const max = Number(process.env.SCRAPE_MAX_EVENTS ?? "0");
  if (max > 0 && rows.length > max) return rows.slice(0, max);
  return rows;
}
