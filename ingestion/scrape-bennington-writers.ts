import { pathToFileURL } from "node:url";
import {
  BENNINGTON_WRITERS_URL,
  parseBenningtonWritersHtml,
} from "./parse-bennington-writers";
import { runCategorySourceScraper } from "./scrape-category-source";

async function main() {
  await runCategorySourceScraper({
    label: "Bennington Young Writers Awards",
    source: "bennington_writers_scrape",
    listingUrl: BENNINGTON_WRITERS_URL,
    stagingFile: "bennington-writers-drafts.json",
    parse: parseBenningtonWritersHtml,
    allowNoCompleteEvents: true,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
