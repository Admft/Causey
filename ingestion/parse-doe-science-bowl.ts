import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

export const KEY_DATES_URL = "https://science.osti.gov/wdts/nsb/Key-Dates";
export const ABOUT_URL = "https://science.osti.gov/wdts/nsb/About";
export const NSB_HOME_URL = "https://science.osti.gov/wdts/nsb";

const MONTH =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

function confirmsWashingtonNational(aboutText: string): boolean {
  return /teams travel to Washington,\s*D\.C\.\s+in April/i.test(aboutText);
}

function nationalEvent(
  year: string,
  dateText: string,
  detailUrl: string,
  locationSourceUrl: string
): RawCategoryEvent | null {
  const dates = parseNamedDateRange(dateText);
  if (!dates || !dates.start.startsWith(`${year}-`)) return null;
  return {
    externalKey: `national-${year}`,
    name: `${year} National Science Bowl National Event`,
    detailUrl,
    registrationUrl: null,
    locationSourceUrl,
    startDate: dates.start,
    endDate: dates.end,
    regDeadline: null,
    participationMode: "in_person",
    venueName: null,
    address: null,
    city: "Washington",
    state: "DC",
    zip: null,
    facets: ["science_bowl", "mathematics"],
    eventType: "National Science Bowl national event",
    availability: "official date published; regional qualification required",
    entryFeeCents: null,
  };
}

function parseTableEvents(
  keyDatesHtml: string,
  detailUrl: string,
  locationSourceUrl: string
): RawCategoryEvent[] {
  const $ = cheerio.load(keyDatesHtml);
  const heading = $("h1, h2, h3")
    .filter((_, element) => /National Science Bowl Calendar of Events/i.test($(element).text()))
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const currentYear = heading.match(/\b(20\d{2})\b/)?.[1] ?? null;
  const events: RawCategoryEvent[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();
    if (cells.length < 2) return;

    const [label, dateText] = cells;
    if (!/National Event$/i.test(label)) return;
    const year = label.match(/\b(20\d{2})\b/)?.[1] ?? currentYear;
    if (!year) return;
    const event = nationalEvent(year, dateText, detailUrl, locationSourceUrl);
    if (event) events.push(event);
  });

  return events;
}

function parseProseEvents(
  html: string,
  detailUrl: string,
  locationSourceUrl: string
): RawCategoryEvent[] {
  const text = cheerio
    .load(html)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const patterns = [
    new RegExp(
      String.raw`\b(20\d{2})\s+National Finals\b[^\d]{0,80}(${MONTH}\s+\d{1,2}\s*[–-]\s*(?:${MONTH}\s+)?\d{1,2},?\s+\1)`,
      "gi"
    ),
    new RegExp(
      String.raw`\b(20\d{2})\s+National Event\b[^\d]{0,80}(${MONTH}\s+\d{1,2}\s*[–-]\s*(?:${MONTH}\s+)?\d{1,2},?\s+\1)`,
      "gi"
    ),
    new RegExp(
      String.raw`\b(20\d{2}):\s*(${MONTH}\s+\d{1,2}\s*[–-]\s*(?:${MONTH}\s+)?\d{1,2},?\s+\1)`,
      "gi"
    ),
  ];
  const events: RawCategoryEvent[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const year = match[1];
      const dateText = match[2];
      if (!year || !dateText) continue;
      const event = nationalEvent(year, dateText, detailUrl, locationSourceUrl);
      if (event) events.push(event);
    }
  }
  return events;
}

function mergeByYear(groups: RawCategoryEvent[][]): RawCategoryEvent[] {
  const byKey = new Map<string, RawCategoryEvent>();
  for (const group of groups) {
    for (const event of group) {
      if (!byKey.has(event.externalKey)) byKey.set(event.externalKey, event);
    }
  }
  return [...byKey.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function parseDoeScienceBowlHtml(
  keyDatesHtml: string,
  aboutHtml: string,
  detailUrl = KEY_DATES_URL,
  locationSourceUrl = ABOUT_URL
): RawCategoryEvent[] {
  const aboutText = cheerio
    .load(aboutHtml)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (!confirmsWashingtonNational(aboutText)) {
    return [];
  }

  return mergeByYear([
    parseTableEvents(keyDatesHtml, detailUrl, locationSourceUrl),
    parseProseEvents(keyDatesHtml, detailUrl, locationSourceUrl),
  ]);
}
