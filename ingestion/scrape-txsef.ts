import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { createZipGeo } from "./geo";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  parseTxsefHtml,
  TXSEF_GENERAL_INFO_URL,
  TXSEF_HOME_URL,
} from "./parse-txsef";
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

const SOURCE = "txsef_scrape" as const;
const STAGING_FILE = "txsef-drafts.json";

const FINALIST_SECTION: ParsedSectionDraft = {
  name: "Texas regional fair finalists (grades 6–12)",
  min_rating: null,
  max_rating: null,
  min_grade: 6,
  max_grade: 12,
  entry_fee_cents: null,
};

async function main() {
  console.log(
    `Scraper: ${TXSEF_HOME_URL}, ${TXSEF_GENERAL_INFO_URL} → source='${SOURCE}' (Texas Science & Engineering Fair)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const homeHtml = await loadListingHtml({ url: TXSEF_HOME_URL });
  if (!process.env.SCRAPE_HTML_FILE) {
    // TXSEF robots.txt requests a 10-second crawl delay.
    await sleep(10_000);
  }
  const generalInfoHtml = await loadListingHtml({
    url: TXSEF_GENERAL_INFO_URL,
  });
  const raw = capRows(parseTxsefHtml(homeHtml, generalInfoHtml));
  if (raw.length === 0) {
    throw new Error(
      "TXSEF returned no exact year-specific state-fair range with official College Station venue, grades 6–12, and regional-qualification evidence."
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
      sections: [FINALIST_SECTION],
    });
  }
  if (drafts.length === 0) {
    throw new Error("TXSEF parsed a row but it did not pass normalization.");
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [TXSEF_HOME_URL, TXSEF_GENERAL_INFO_URL],
    parsed: raw.length,
    category: "stem",
    coverage:
      "Texas state fair only; students must qualify through a regional fair.",
    access_basis:
      "TXSEF robots.txt allows these public HTML pages with a 10-second crawl delay. Texas A&M permits attributed linking, and the pages publish no automation or commercial-use prohibition. Causey retains factual event metadata only.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
