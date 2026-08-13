import { pathToFileURL } from "node:url";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  AFSA_CHECKLIST_URL,
  AFSA_ESSAY_URL,
  parseAfsaEssayHtml,
} from "./parse-afsa-essay";
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

const SOURCE = "afsa_essay_scrape" as const;
const STAGING_FILE = "afsa-essay-drafts.json";

const HIGH_SCHOOL_SECTION: ParsedSectionDraft = {
  name: "Grades 9–12",
  min_rating: null,
  max_rating: null,
  min_grade: 9,
  max_grade: 12,
  entry_fee_cents: null,
};

async function main() {
  console.log(
    `Scraper: ${AFSA_ESSAY_URL}, ${AFSA_CHECKLIST_URL} → source='${SOURCE}' (AFSA National High School Essay Contest)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const contestHtml = await loadListingHtml({ url: AFSA_ESSAY_URL });
  if (!process.env.SCRAPE_HTML_FILE) await sleep(350);
  const checklistHtml = await loadListingHtml({ url: AFSA_CHECKLIST_URL });
  const raw = capRows(parseAfsaEssayHtml(contestHtml, checklistHtml));
  if (raw.length === 0) {
    throw new Error(
      "AFSA did not publish a cycle, matching year-specific deadline, eligibility, and open/closed status across its official pages."
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
      sections: [HIGH_SCHOOL_SECTION],
    });
  }
  if (drafts.length === 0) {
    throw new Error("AFSA parsed a row but it did not pass normalization.");
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [AFSA_ESSAY_URL, AFSA_CHECKLIST_URL],
    parsed: raw.length,
    category: "writing",
    access_basis:
      "AFSA robots.txt permits these public pages; its published Conditions of Use contain no automation or commercial-use prohibition. Causey stores only factual cycle metadata with attribution.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
