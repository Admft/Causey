import { pathToFileURL } from "node:url";
import { assertSourceAutomationAllowed } from "../lib/ingestion-sources";
import { getServiceRoleClient } from "../lib/supabase/client";
import { createZipGeo } from "./geo";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import { openSection } from "./parse-sections";
import { parseDoeScienceBowlHtml } from "./parse-doe-science-bowl";
import type { StagedCompetition } from "./persist";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  sleep,
  upsertOrExit,
} from "./scrape-hub-utils";

const SOURCE = "doe_science_bowl_scrape" as const;
const KEY_DATES_URL = "https://science.osti.gov/wdts/nsb/Key-Dates";
const ABOUT_URL = "https://science.osti.gov/wdts/nsb/About";
const STAGING_FILE = "doe-science-bowl-drafts.json";

async function main() {
  console.log(
    `Scraper: ${KEY_DATES_URL}, ${ABOUT_URL} → source='${SOURCE}' (DOE National Science Bowl)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  assertSourceAutomationAllowed(SOURCE);
  const keyDatesHtml = await loadListingHtml({ url: KEY_DATES_URL });
  if (!process.env.SCRAPE_HTML_FILE) await sleep(350);
  const aboutHtml = await loadListingHtml({ url: ABOUT_URL });
  const raw = capRows(parseDoeScienceBowlHtml(keyDatesHtml, aboutHtml));
  if (raw.length === 0) {
    throw new Error(
      "DOE National Science Bowl returned no complete national event dates with an official Washington, DC location statement."
    );
  }

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (const event of raw) {
    const resolved = client ? await geo.resolveLocation(event) : null;
    const competition = normalizeCategorySourceEvent(event, {
      id: newId(),
      source: SOURCE,
      coords: resolved?.coords ?? null,
      resolvedZip: resolved?.zip ?? event.zip,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition) continue;
    drafts.push({
      ...competition,
      external_key: event.externalKey,
      sections: [openSection("Middle and high school teams")],
    });
  }
  if (drafts.length === 0) {
    throw new Error(
      "DOE National Science Bowl parsed rows but none passed normalization."
    );
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [KEY_DATES_URL, ABOUT_URL],
    parsed: raw.length,
    category: "stem",
    access_basis:
      "Office of Science robots.txt allows these pages; its Web Policies mark site materials public domain with source acknowledgment and no implied endorsement.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
