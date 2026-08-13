import { pathToFileURL } from "node:url";
import { parseTabroomHtml } from "./parse-tabroom";
import { runCategorySourceScraper } from "./scrape-category-source";

export const TABROOM_LISTING_URL =
  "https://www.tabroom.com/index/circuit/calendar.mhtml?circuit_id=198";

async function main() {
  await runCategorySourceScraper({
    label: "Tabroom Texas circuit",
    source: "tabroom_scrape",
    listingUrl: TABROOM_LISTING_URL,
    stagingFile: "tabroom-drafts.json",
    parse: parseTabroomHtml,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
