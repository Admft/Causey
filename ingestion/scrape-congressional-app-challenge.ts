import { pathToFileURL } from "node:url";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  CAC_DISTRICTS_URL,
  CAC_RULES_URL,
  parseCongressionalAppChallengeHtml,
} from "./parse-congressional-app-challenge";
import type { ParsedSectionDraft } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  sleep,
  upsertOrExit,
} from "./scrape-hub-utils";

const SOURCE = "congressional_app_challenge_scrape" as const;
const STAGING_FILE = "congressional-app-challenge-drafts.json";

const STUDENT_SECTION: ParsedSectionDraft = {
  name: "Middle and high school",
  min_rating: null,
  max_rating: null,
  min_grade: null,
  max_grade: null,
  entry_fee_cents: null,
};

async function main() {
  console.log(
    `Scraper: ${CAC_DISTRICTS_URL}, ${CAC_RULES_URL} → source='${SOURCE}' (Congressional App Challenge)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const districtsHtml = await loadListingHtml({ url: CAC_DISTRICTS_URL });
  if (!process.env.SCRAPE_HTML_FILE) await sleep(350);
  const rulesHtml = await loadListingHtml({ url: CAC_RULES_URL });
  const raw = capRows(
    parseCongressionalAppChallengeHtml(districtsHtml, rulesHtml)
  );
  if (raw.length === 0) {
    throw new Error(
      "Congressional App Challenge did not publish a matching year-specific national submission window and middle/high-school eligibility across its official HTML pages."
    );
  }

  const drafts: StagedCompetition[] = [];
  for (const event of raw) {
    const competition = normalizeCategorySourceEvent(event, {
      id: newId(),
      source: SOURCE,
    });
    if (!competition) continue;
    drafts.push({
      ...competition,
      external_key: event.externalKey,
      sections: [STUDENT_SECTION],
    });
  }
  if (drafts.length === 0) {
    throw new Error(
      "Congressional App Challenge parsed a row but it did not pass normalization."
    );
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [CAC_DISTRICTS_URL, CAC_RULES_URL],
    parsed: raw.length,
    category: "stem",
    access_basis:
      "congressionalappchallenge.us robots.txt allows these public HTML paths except /wp-admin/. Published site terms reviewed 2026-09-06 contain no automation or commercial-use prohibition. Causey stores one national submission window with attribution and does not ingest the participating-district table, PDFs, or registration portals.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
