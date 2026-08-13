import * as cheerio from "cheerio";
import {
  parseNamedDate,
  type RawCategoryEvent,
} from "./category-source-types";

export const BENNINGTON_WRITERS_URL =
  "https://www.bennington.edu/events/young-writers-awards";

export function benningtonGenres(text: string): string[] {
  const genres = new Set<string>();
  if (/\bfiction\b/i.test(text)) genres.add("fiction");
  if (/\bnonfiction\b/i.test(text)) genres.add("nonfiction");
  if (/\bpoetry\b|\bpoems?\b/i.test(text)) genres.add("poetry");
  if (/\bessay\b/i.test(text)) genres.add("essay");
  return [...genres];
}

/**
 * The live page currently publishes month/day milestones without a year.
 * Returning no row in that case prevents Causey from inventing a cycle.
 */
export function parseBenningtonWritersHtml(
  html: string,
  sourceUrl = BENNINGTON_WRITERS_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    "Bennington Young Writers Awards";
  const opensText =
    text.match(/Submissions open\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i)?.[1] ??
    "";
  const deadlineText =
    text.match(
      /(?:Submission deadline|submissions (?:close|due))\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
    )?.[1] ?? "";
  const startDate = parseNamedDate(opensText);
  const deadline = parseNamedDate(deadlineText);
  if (!startDate || !deadline) return [];

  return [
    {
      externalKey: `young-writers-${startDate.slice(0, 4)}`,
      name: title,
      detailUrl: sourceUrl,
      startDate,
      endDate: deadline,
      regDeadline: deadline,
      participationMode: "online",
      venueName: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      facets: benningtonGenres(text),
      eventType: "Writing awards",
      availability: "submissions cycle published",
      entryFeeCents: /\bno entry fee\b|\bfree to enter\b/i.test(text) ? 0 : null,
    },
  ];
}
