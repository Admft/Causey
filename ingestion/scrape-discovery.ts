import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const SCRIPTS = [
  "ingestion/scrape-taea-vase.ts",
  "ingestion/scrape-bennington-writers.ts",
  "ingestion/scrape-afsa-essay.ts",
  "ingestion/scrape-uil-theatre.ts",
  "ingestion/scrape-uil-speech-debate.ts",
  "ingestion/scrape-purple-comet.ts",
  "ingestion/scrape-uil-music-marching.ts",
  "ingestion/scrape-txsef.ts",
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
  for (const script of SCRIPTS) await run(script);
  console.log(
    "Skipped VEX Events and DOE National Science Bowl because ordinary public requests currently return HTTP 403. Their direct adapters also fail closed; never bypass source controls."
  );
  console.log(
    "Skipped Tabroom because NSDA Terms prohibit automated access and commercial/public reuse. Run scrape:tabroom only after obtaining written NSDA permission and setting TABROOM_WRITTEN_PERMISSION=1."
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
