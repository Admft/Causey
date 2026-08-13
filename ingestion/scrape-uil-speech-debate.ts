import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { createZipGeo } from "./geo";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  parseUilSpeechDebateHtml,
  UIL_INVITATIONAL_MEETS_URL,
} from "./parse-uil-speech-debate";
import type { ParsedSectionDraft } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";

const SOURCE = "uil_speech_debate_scrape" as const;
const STAGING_FILE = "uil-speech-debate-drafts.json";

const UIL_SECTION: ParsedSectionDraft = {
  name: "UIL school entrants",
  min_rating: null,
  max_rating: null,
  min_grade: null,
  max_grade: null,
  entry_fee_cents: null,
};

async function main() {
  console.log(
    `Scraper: ${UIL_INVITATIONAL_MEETS_URL} → source='${SOURCE}' (UIL Speech & Debate)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const html = await loadListingHtml({ url: UIL_INVITATIONAL_MEETS_URL });
  const raw = capRows(parseUilSpeechDebateHtml(html));
  if (raw.length === 0) {
    throw new Error(
      "UIL returned no year-specific invitational rows with explicit speech/debate evidence and complete Texas locations."
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
      sections: [UIL_SECTION],
    });
  }
  if (drafts.length === 0) {
    throw new Error("UIL parsed rows but none passed normalization.");
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [UIL_INVITATIONAL_MEETS_URL],
    parsed: raw.length,
    category: "debate",
    coverage:
      "Texas UIL invitational calendar rows with explicit speech/debate offerings and complete locations; third-party registration pages are not fetched.",
    access_basis:
      "UIL robots.txt allows the public academic calendar HTML path. Causey reads no disallowed /files/ assets and retains factual event metadata with attribution.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
