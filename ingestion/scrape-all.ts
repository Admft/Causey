/**
 * Run scrapers in sequence so fingerprint dedupe can collapse
 * cross-source duplicates in one ops pass.
 *
 *   npm run scrape:all
 */
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { getServiceRoleClient } from "../lib/supabase/client";
import { loadDotEnv } from "./persist";
import { finishScrapeRun, startScrapeRun } from "./scrape-run";

const SCRIPTS = [
  { label: "TLA", script: "ingestion/scrape-tla.ts", source: "tla_scrape" },
  { label: "CCA", script: "ingestion/scrape-cca.ts", source: "cca_scrape" },
  { label: "OnlineReg", script: "ingestion/scrape-onlinereg.ts", source: "onlinereg_scrape" },
  { label: "Chess-Results", script: "ingestion/scrape-chess-results.ts", source: "chess_results_scrape" },
  { label: "FIDE", script: "ingestion/scrape-fide.ts", source: "fide_calendar_scrape" },
  { label: "Texas Chess Association", script: "ingestion/scrape-tca.ts", source: "tca_scrape" },
] as const;

function run(script: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", script], {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  loadDotEnv();
  const client = getServiceRoleClient();
  const runId = await startScrapeRun(client, "all", {
    strategy: "stage_all_then_persist",
    source_count: SCRIPTS.length,
  });
  const staged: string[] = [];
  const persisted: string[] = [];
  let phase: "staging" | "persistence" = "staging";

  try {
    console.log("=== scrape:all — stage every source before database writes ===\n");
    for (const step of SCRIPTS) {
      console.log(`\n=== Stage ${step.label} ===\n`);
      await run(step.script, {
        ...process.env,
        SCRAPE_STAGE_ONLY: "1",
        SCRAPE_UPSERT_ONLY: "0",
      });
      staged.push(step.source);
    }

    if (!client) {
      console.log("\n=== scrape:all staged all sources; Supabase is not configured ===");
      await finishScrapeRun(client, runId, "succeeded", {
        meta: { strategy: "stage_all_then_persist", staged, persisted },
      });
      return;
    }

    phase = "persistence";
    const completeSnapshot =
      !process.env.SCRAPE_HTML_FILE && !process.env.SCRAPE_MAX_EVENTS;
    for (const step of SCRIPTS) {
      console.log(`\n=== Persist ${step.label} ===\n`);
      await run(step.script, {
        ...process.env,
        SCRAPE_STAGE_ONLY: "0",
        SCRAPE_UPSERT_ONLY: "1",
        SCRAPE_COMPLETE_SNAPSHOT: completeSnapshot ? "1" : "0",
      });
      persisted.push(step.source);
    }

    await finishScrapeRun(client, runId, "succeeded", {
      meta: {
        strategy: "stage_all_then_persist",
        staged,
        persisted,
        complete_source_snapshots: completeSnapshot,
      },
    });
    console.log("\n=== scrape:all complete ===");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishScrapeRun(
      client,
      runId,
      "failed",
      {
        meta: {
          strategy: "stage_all_then_persist",
          phase,
          staged,
          persisted,
          partial_persistence: persisted.length > 0,
        },
      },
      message
    );
    if (phase === "staging") {
      throw new Error(
        `scrape:all staging failed before competition persistence; no source snapshots were applied. ${message}`
      );
    }
    throw new Error(
      `scrape:all persistence failed after ${persisted.length}/${SCRIPTS.length} sources; ` +
        `the parent scrape run records partial state. ${message}`
    );
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
