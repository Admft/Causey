import { pathToFileURL } from "node:url";
import { parseTabroomHtml } from "./parse-tabroom";
import { runCategorySourceScraper } from "./scrape-category-source";

export const TABROOM_LISTING_URL =
  "https://www.tabroom.com/index/circuit/calendar.mhtml?circuit_id=198";

export function assertTabroomLiveAccessAllowed(
  env: Record<string, string | undefined> = process.env
): "permitted" | "fixture-only" {
  if (env.TABROOM_WRITTEN_PERMISSION === "1") return "permitted";
  if (env.SCRAPE_HTML_FILE && env.SCRAPE_UPSERT_ONLY !== "1") {
    return "fixture-only";
  }
  throw new Error(
    "Tabroom ingestion is paused. NSDA Terms apply to tabroom.com and prohibit automated access plus commercial/public reuse. Obtain written NSDA permission, then set TABROOM_WRITTEN_PERMISSION=1. Local fixture parsing remains stage-only."
  );
}

async function main() {
  const access = assertTabroomLiveAccessAllowed();
  if (access === "fixture-only") {
    process.env.SCRAPE_STAGE_ONLY = "1";
    process.env.SCRAPE_RETRACT_STALE = "off";
  }
  await runCategorySourceScraper({
    label: "Tabroom Texas circuit",
    source: "tabroom_scrape",
    listingUrl: TABROOM_LISTING_URL,
    stagingFile: process.env.SCRAPE_HTML_FILE
      ? "tabroom-fixture-check.json"
      : "tabroom-drafts.json",
    parse: parseTabroomHtml,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
