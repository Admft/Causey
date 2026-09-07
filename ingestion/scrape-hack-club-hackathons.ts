import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { fetchHtml } from "./fetch-html";
import { createZipGeo } from "./geo";
import { normalizeCategorySourceEvent } from "./normalize-category-source";
import {
  HACK_CLUB_HACKATHONS_API_URL,
  HACK_CLUB_HACKATHONS_CREDIT_URL,
  HACK_CLUB_HACKATHONS_DOCS_URL,
  parseHackClubHackathonsJson,
} from "./parse-hack-club-hackathons";
import type { ParsedSectionDraft } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  upsertOrExit,
} from "./scrape-hub-utils";

const SOURCE = "hack_club_hackathons_scrape" as const;
const STAGING_FILE = "hack-club-hackathons-drafts.json";

const HIGH_SCHOOL_SECTION: ParsedSectionDraft = {
  name: "High school",
  min_rating: null,
  max_rating: null,
  min_grade: null,
  max_grade: 12,
  entry_fee_cents: null,
};

async function main() {
  console.log(
    `Scraper: ${HACK_CLUB_HACKATHONS_API_URL} → source='${SOURCE}' (Hack Club Hackathons)`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(STAGING_FILE, SOURCE);
    return;
  }

  const jsonText = process.env.SCRAPE_HTML_FILE
    ? await loadListingHtml({ url: HACK_CLUB_HACKATHONS_API_URL })
    : await fetchHtml(HACK_CLUB_HACKATHONS_API_URL, {
        headers: { Accept: "application/json" },
      });
  const raw = capRows(parseHackClubHackathonsJson(jsonText));
  if (raw.length === 0) {
    throw new Error(
      "Hack Club Hackathons API returned no upcoming virtual or US in-person events with exact start dates."
    );
  }

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (const event of raw) {
    const resolved =
      event.participationMode === "online"
        ? null
        : client
          ? await geo.resolveLocation(event)
          : null;
    const competition = normalizeCategorySourceEvent(event, {
      id: newId(),
      source: SOURCE,
      coords: resolved?.coords ?? null,
      resolvedZip: resolved?.zip ?? event.zip,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition || competition.status !== "published") continue;
    drafts.push({
      ...competition,
      external_key: event.externalKey,
      sections: [HIGH_SCHOOL_SECTION],
    });
  }
  if (drafts.length === 0) {
    throw new Error(
      "Hack Club Hackathons parsed upcoming rows, but none were virtual or US events that resolved a publishable location."
    );
  }

  await upsertOrExit(drafts, SOURCE, STAGING_FILE, {
    listings: [HACK_CLUB_HACKATHONS_API_URL, HACK_CLUB_HACKATHONS_DOCS_URL],
    parsed: raw.length,
    category: "stem",
    credit: "Hack Club Hackathons",
    credit_url: HACK_CLUB_HACKATHONS_CREDIT_URL,
    coverage:
      "Virtual hackathons plus US in-person/hybrid rows with a city and state. International in-person listings, logos, and banners are not stored.",
    access_basis:
      "Documented public JSON API at hackathons.hackclub.com/api/events/upcoming. The API docs require crediting “Hack Club Hackathons” with a link to hackathons.hackclub.com. Subdomain robots.txt is absent (HTTP 404); hackclub.com robots.txt allows /. Ordinary JSON returned HTTP 200 on 2026-09-06. Causey does not rehost signed cover images or treat the frontend MIT license as a data license.",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
