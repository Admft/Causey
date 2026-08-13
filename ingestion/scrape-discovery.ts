import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const SCRIPTS = [
  "ingestion/scrape-taea-vase.ts",
  "ingestion/scrape-bennington-writers.ts",
  "ingestion/scrape-doe-science-bowl.ts",
  "ingestion/scrape-afsa-essay.ts",
  "ingestion/scrape-uil-theatre.ts",
  "ingestion/scrape-uil-speech-debate.ts",
  "ingestion/scrape-purple-comet.ts",
  "ingestion/scrape-uil-music-marching.ts",
  "ingestion/scrape-txsef.ts",
] as const;

const BLOCKED_SCRIPTS = ["ingestion/scrape-vex-events.ts"] as const;

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
  if (process.env.SCRAPE_INCLUDE_BLOCKED === "1") {
    for (const script of BLOCKED_SCRIPTS) await run(script);
  } else {
    console.log(
      "Skipped VEX Events because normal public fetches currently return HTTP 403. Set SCRAPE_INCLUDE_BLOCKED=1 only to re-check ordinary access; never bypass source controls."
    );
  }
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
