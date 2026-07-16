/**
 * Run both scrapers in sequence (TLA then CCA) so fingerprint dedupe can
 * collapse cross-source duplicates in one ops pass.
 *
 *   npm run scrape:all
 */
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

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
  console.log("=== scrape:all — TLA then CCA ===\n");
  await run("ingestion/scrape-tla.ts");
  console.log("\n=== CCA ===\n");
  await run("ingestion/scrape-cca.ts");
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
