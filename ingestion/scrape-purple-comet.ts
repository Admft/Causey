import { pathToFileURL } from "node:url";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  parsePurpleCometHtml,
  PURPLE_COMET_RULES_URL,
  PURPLE_COMET_URL,
} from "./parse-purple-comet";
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

const SOURCE = "purple_comet_scrape" as const;
const STAGING_FILE = "purple-comet-drafts.json";

const ELIGIBILITY_SECTIONS: ParsedSectionDraft[] = [
  {
    name: "Competitive middle school teams (under 16)",
    min_rating: null,
    max_rating: null,
    min_grade: null,
    max_grade: 8,
    entry_fee_cents: 0,
  },
  {
    name: "Competitive high school teams (under 20)",
    min_rating: null,
    max_rating: null,
    min_grade: null,
    max_grade: 12,
    entry_fee_cents: 0,
  },
];

async function main() {
  console.log(
    `Scraper: ${PURPLE_COMET_URL}, ${PURPLE_COMET_RULES_URL} → source='${SOURCE}' (Purple Comet! Math Meet)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const homeHtml = await loadListingHtml({ url: PURPLE_COMET_URL });
  if (!process.env.SCRAPE_HTML_FILE) await sleep(350);
  const rulesHtml = await loadListingHtml({ url: PURPLE_COMET_RULES_URL });
  const raw = capRows(parsePurpleCometHtml(homeHtml, rulesHtml));
  if (raw.length === 0) {
    throw new Error(
      "Purple Comet did not publish a complete year-specific window together with explicit online, team, school-level, supervisor, and free-participation rules."
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
      sections: ELIGIBILITY_SECTIONS,
    });
  }
  if (drafts.length === 0) {
    throw new Error("Purple Comet parsed a row but it did not pass normalization.");
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [PURPLE_COMET_URL, PURPLE_COMET_RULES_URL],
    parsed: raw.length,
    category: "stem",
    coverage:
      "One official international Purple Comet contest window; no local host calendar or student login data is indexed.",
    access_basis:
      "Purple Comet robots.txt allows all paths and the public pages publish no general Terms of Use or automation prohibition. Causey retains only factual event metadata and eligibility summaries, never contest problems, solutions, participant data, or login content.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
