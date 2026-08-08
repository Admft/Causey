/**
 * Run scrapers in sequence so fingerprint dedupe can collapse
 * cross-source duplicates in one ops pass.
 *
 *   npm run scrape:all
 */
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const SCRIPTS = [
  { label: "TLA", script: "ingestion/scrape-tla.ts" },
  { label: "CCA", script: "ingestion/scrape-cca.ts" },
  { label: "OnlineReg", script: "ingestion/scrape-onlinereg.ts" },
  { label: "Chess-Results", script: "ingestion/scrape-chess-results.ts" },
  { label: "FIDE", script: "ingestion/scrape-fide.ts" },
  { label: "Texas Chess Association", script: "ingestion/scrape-tca.ts" },
] as const;

function run(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", script], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log("=== scrape:all — hubs in sequence ===\n");
  for (const step of SCRIPTS) {
    console.log(`\n=== ${step.label} ===\n`);
    await run(step.script);
  }
  console.log("\n=== scrape:all complete ===");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
