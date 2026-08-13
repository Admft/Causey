import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { createZipGeo } from "./geo";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  parseUilTheatreHtml,
  UIL_THEATRE_STATE_URL,
} from "./parse-uil-theatre";
import type { ParsedSectionDraft } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";

const SOURCE = "uil_theatre_scrape" as const;
const STAGING_FILE = "uil-theatre-drafts.json";

function eligibilitySection(eventType: string | null): ParsedSectionDraft {
  return {
    name:
      eventType === "High School Theatrical Design State Meet"
        ? "UIL high school theatrical design qualifiers"
        : "UIL high school one-act play qualifiers",
    min_rating: null,
    max_rating: null,
    // UIL publishes a narrow 1A eighth-grader appeal exception, so a strict
    // grade 9 minimum would overstate the normal high-school eligibility rule.
    min_grade: null,
    max_grade: null,
    entry_fee_cents: null,
  };
}

async function main() {
  console.log(
    `Scraper: ${UIL_THEATRE_STATE_URL} → source='${SOURCE}' (UIL Theatre State Meets)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const html = await loadListingHtml({ url: UIL_THEATRE_STATE_URL });
  const raw = capRows(parseUilTheatreHtml(html));
  if (raw.length === 0) {
    throw new Error(
      "UIL Theatre returned no complete state-meet ranges with a tentative schedule and Austin location evidence."
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
      sections: [eligibilitySection(event.eventType)],
    });
  }
  if (drafts.length === 0) {
    throw new Error("UIL Theatre parsed rows but none passed normalization.");
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [UIL_THEATRE_STATE_URL],
    parsed: raw.length,
    category: "arts",
    coverage:
      "UIL 2027 theatre state meets only; regional, district, zone, and local events are not indexed.",
    access_basis:
      "UIL robots.txt allows the public theatre HTML path, and no applicable automation prohibition is published on that page. Causey reads no disallowed /files/ assets and retains only factual event metadata with source attribution.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
