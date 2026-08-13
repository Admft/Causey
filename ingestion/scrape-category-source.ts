import type { RawCategoryEvent } from "./category-source-types";
import {
  normalizeCategorySourceEvent,
  type CategoryScrapeSource,
} from "./normalize-category-source";
import { createZipGeo } from "./geo";
import {
  capRows,
  loadListingHtml,
  newId,
  runUpsertOnly,
  sleep,
  upsertOrExit,
} from "./scrape-hub-utils";
import { openSection } from "./parse-sections";
import type { StagedCompetition } from "./persist";
import { getServiceRoleClient } from "../lib/supabase/client";

export async function runCategorySourceScraper(options: {
  label: string;
  source: CategoryScrapeSource;
  listingUrl: string;
  additionalListingUrls?: readonly string[];
  stagingFile: string;
  parse: (html: string, url: string) => RawCategoryEvent[];
  allowNoCompleteEvents?: boolean;
}): Promise<void> {
  const listingUrls = process.env.SCRAPE_HTML_FILE
    ? [options.listingUrl]
    : [options.listingUrl, ...(options.additionalListingUrls ?? [])];
  console.log(
    `Scraper: ${listingUrls.join(", ")} → source='${options.source}' (${options.label})`
  );
  if (process.env.SCRAPE_UPSERT_ONLY === "1") {
    await runUpsertOnly(options.stagingFile, options.source);
    return;
  }

  const parsed: RawCategoryEvent[] = [];
  for (const [index, listingUrl] of listingUrls.entries()) {
    if (index > 0) await sleep(350);
    const html = await loadListingHtml({ url: listingUrl });
    parsed.push(...options.parse(html, listingUrl));
  }
  const raw = capRows(parsed);
  if (raw.length === 0) {
    if (options.allowNoCompleteEvents) {
      console.log(
        `${options.label} has no complete, year-specific cycle to stage; leaving existing data unchanged.`
      );
      return;
    }
    throw new Error(
      `${options.label} returned no complete, year-specific events; refusing to stage an empty source snapshot.`
    );
  }

  const client = getServiceRoleClient();
  const geo = createZipGeo(client);
  const drafts: StagedCompetition[] = [];
  for (const event of raw) {
    const resolved =
      event.participationMode === "online" || !client
        ? null
        : await geo.resolveLocation(event);
    const competition = normalizeCategorySourceEvent(event, {
      id: newId(),
      source: options.source,
      coords: resolved?.coords ?? null,
      resolvedZip: resolved?.zip ?? event.zip,
      geoPrecision: resolved?.precision ?? null,
    });
    if (!competition) continue;
    drafts.push({
      ...competition,
      external_key: event.externalKey,
      sections: [openSection(event.eventType ?? "Open")],
    });
  }
  if (drafts.length === 0) {
    throw new Error(`${options.label} parsed rows but none passed normalization.`);
  }

  await upsertOrExit(drafts, options.source, options.stagingFile, {
    listings: listingUrls,
    parsed: raw.length,
    category: drafts[0]?.category,
  });
}
