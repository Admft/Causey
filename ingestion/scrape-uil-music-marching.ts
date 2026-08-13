import { pathToFileURL } from "node:url";
import {
  parseUilMusicMarchingHtml,
  UIL_MUSIC_MARCHING_STATE_URL,
} from "./parse-uil-music-marching";
import { runCategorySourceScraper } from "./scrape-category-source";

async function main() {
  await runCategorySourceScraper({
    label: "UIL State Open Class Marching Band",
    source: "uil_music_marching_scrape",
    listingUrl: UIL_MUSIC_MARCHING_STATE_URL,
    stagingFile: "uil-music-marching-drafts.json",
    parse: parseUilMusicMarchingHtml,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
