import { pathToFileURL } from "node:url";
import { parseVexEventsHtml } from "./parse-vex-events";
import { runCategorySourceScraper } from "./scrape-category-source";

export const VEX_EVENTS_LISTING_URL =
  "https://events.vex.com/robot-competitions/vex-robotics-competition";

async function main() {
  await runCategorySourceScraper({
    label: "VEX Events",
    source: "vex_events_scrape",
    listingUrl: VEX_EVENTS_LISTING_URL,
    stagingFile: "vex-events-drafts.json",
    parse: parseVexEventsHtml,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
