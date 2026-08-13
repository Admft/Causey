import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

const KEY_DATES_URL = "https://science.osti.gov/wdts/nsb/Key-Dates";
const ABOUT_URL = "https://science.osti.gov/wdts/nsb/About";

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
  if (!/teams travel to Washington,\s*D\.C\.\s+in April/i.test(aboutText)) {
    return [];
  }

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
    const dates = parseNamedDateRange(dateText);
    if (!year || !dates || !dates.start.startsWith(`${year}-`)) return;

    events.push({
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
    });
  });

  return events;
}
