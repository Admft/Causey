/**
 * Run scrapers in sequence so fingerprint dedupe can collapse
 * cross-source duplicates in one ops pass.
 *
 * Staging failures on one host (FIDE connect timeouts) must not throw away
 * already-staged TLA/CCA/TCA snapshots. Persist what staged, then fail the
 * parent run so Actions still flags the dead source.
 *
 *   npm run scrape:all
 */
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { getServiceRoleClient } from "../lib/supabase/client";
import { loadDotEnv } from "./persist";
import { finishScrapeRun, startScrapeRun } from "./scrape-run";

export const CHESS_SCRAPE_STEPS = [
  { label: "TLA", script: "ingestion/scrape-tla.ts", source: "tla_scrape" },
  { label: "CCA", script: "ingestion/scrape-cca.ts", source: "cca_scrape" },
  { label: "OnlineReg", script: "ingestion/scrape-onlinereg.ts", source: "onlinereg_scrape" },
  { label: "Chess-Results", script: "ingestion/scrape-chess-results.ts", source: "chess_results_scrape" },
  { label: "FIDE", script: "ingestion/scrape-fide.ts", source: "fide_calendar_scrape" },
  { label: "Texas Chess Association", script: "ingestion/scrape-tca.ts", source: "tca_scrape" },
] as const;

export type ChessScrapeStep = (typeof CHESS_SCRAPE_STEPS)[number];

export type SourceStageFailure = {
  label: string;
  source: string;
  message: string;
};

export async function stageChessSources(
  steps: readonly { label: string; script: string; source: string }[],
  runScript: (script: string, env: NodeJS.ProcessEnv) => Promise<void>,
  env: NodeJS.ProcessEnv
): Promise<{ staged: string[]; failures: SourceStageFailure[] }> {
  const staged: string[] = [];
  const failures: SourceStageFailure[] = [];
  for (const step of steps) {
    console.log(`\n=== Stage ${step.label} ===\n`);
    try {
      await runScript(step.script, {
        ...env,
        SCRAPE_STAGE_ONLY: "1",
        SCRAPE_UPSERT_ONLY: "0",
      });
      staged.push(step.source);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Stage ${step.label} failed: ${message}`);
      failures.push({ label: step.label, source: step.source, message });
    }
  }
  return { staged, failures };
}

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
    source_count: CHESS_SCRAPE_STEPS.length,
  });
  const persisted: string[] = [];
  let phase: "staging" | "persistence" = "staging";
  let staged: string[] = [];
  let stagingFailures: SourceStageFailure[] = [];

  try {
    console.log("=== scrape:all — stage every source before database writes ===\n");
    ({ staged, failures: stagingFailures } = await stageChessSources(
      CHESS_SCRAPE_STEPS,
      run,
      process.env
    ));

    if (staged.length === 0) {
      const message = `scrape:all staged zero sources; no source snapshots were applied. ${
        stagingFailures[0]?.message ?? "every chess source failed"
      }`;
      await finishScrapeRun(
        client,
        runId,
        "failed",
        {
          meta: {
            strategy: "stage_all_then_persist",
            phase: "staging",
            staged,
            persisted,
            staging_failures: stagingFailures,
          },
        },
        message
      );
      throw new Error(message);
    }

    if (!client) {
      console.log("\n=== scrape:all staged sources; Supabase is not configured ===");
      await finishScrapeRun(client, runId, stagingFailures.length ? "failed" : "succeeded", {
        meta: {
          strategy: "stage_all_then_persist",
          staged,
          persisted,
          staging_failures: stagingFailures,
        },
      }, stagingFailures[0]?.message);
      if (stagingFailures.length) {
        throw new Error(
          `scrape:all staged ${staged.length}/${CHESS_SCRAPE_STEPS.length} sources without a database; ` +
            `staging failed for ${stagingFailures.map((f) => f.label).join(", ")}.`
        );
      }
      return;
    }

    phase = "persistence";
    const completeSnapshot =
      !process.env.SCRAPE_HTML_FILE && !process.env.SCRAPE_MAX_EVENTS;
    for (const step of CHESS_SCRAPE_STEPS) {
      if (!staged.includes(step.source)) continue;
      console.log(`\n=== Persist ${step.label} ===\n`);
      await run(step.script, {
        ...process.env,
        SCRAPE_STAGE_ONLY: "0",
        SCRAPE_UPSERT_ONLY: "1",
        SCRAPE_COMPLETE_SNAPSHOT: completeSnapshot ? "1" : "0",
      });
      persisted.push(step.source);
    }

    if (stagingFailures.length) {
      const failedLabels = stagingFailures.map((f) => f.label).join(", ");
      await finishScrapeRun(
        client,
        runId,
        "failed",
        {
          meta: {
            strategy: "stage_all_then_persist",
            phase: "staging",
            staged,
            persisted,
            staging_failures: stagingFailures,
            skipped_snapshots: stagingFailures.map((f) => f.source),
          },
        },
        stagingFailures.map((f) => `${f.label}: ${f.message}`).join("; ")
      );
      throw new Error(
        `scrape:all persisted ${persisted.length}/${CHESS_SCRAPE_STEPS.length} sources; ` +
          `staging failed for ${failedLabels} and those listings were left unchanged.`
      );
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
    if (message.startsWith("scrape:all ")) throw error;
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
          staging_failures: stagingFailures,
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
      `scrape:all persistence failed after ${persisted.length}/${CHESS_SCRAPE_STEPS.length} sources; ` +
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
