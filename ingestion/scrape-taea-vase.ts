import { pathToFileURL } from "node:url";
import { parseTaeaVaseHtml, TAEA_VASE_URL } from "./parse-taea-vase";
import { runCategorySourceScraper } from "./scrape-category-source";

const TAEA_STATE_VASE_URL =
  "https://www.taea.org/vase/state-overview.asp";

async function main() {
  await runCategorySourceScraper({
    label: "TAEA VASE",
    source: "taea_vase_scrape",
    listingUrl: TAEA_VASE_URL,
    additionalListingUrls: [TAEA_STATE_VASE_URL],
    stagingFile: "taea-vase-drafts.json",
    parse: parseTaeaVaseHtml,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
