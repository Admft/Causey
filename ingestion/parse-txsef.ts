import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

export const TXSEF_HOME_URL = "https://txsef.tamu.edu/";
export const TXSEF_GENERAL_INFO_URL =
  "https://txsef.tamu.edu/general-information/";

function pageText(html: string): string {
  return cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();
}

export function parseTxsefHtml(
  homeHtml: string,
  generalInfoHtml: string,
  detailUrl = TXSEF_HOME_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(homeHtml);
  const title = $("title").text().replace(/\s+/g, " ").trim();
  const eventHeading = $("h1, h2, h3")
    .filter((_, element) =>
      /\b20\d{2}\s+Texas Science and Engineering Fair\b/i.test(
        $(element).text()
      )
    )
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const headingMatch = eventHeading.match(
    /\b(20\d{2})\s+Texas Science and Engineering Fair\s*\|\s*(.+)$/i
  );
  const dates = headingMatch ? parseNamedDateRange(headingMatch[2]) : null;
  const homeText = pageText(homeHtml);
  const generalText = pageText(generalInfoHtml);

  if (
    !/Texas Science (?:&|and) Engineering Fair.*Texas A&M University/i.test(
      title
    ) ||
    !headingMatch ||
    !dates ||
    !dates.end ||
    !dates.start.startsWith(`${headingMatch[1]}-`) ||
    !/College Station,\s*Texas,\s*at the Texas A&M University Student Recreation Center/i.test(
      homeText
    ) ||
    !/6th\s*[-–]\s*12th grade student finalists from across Texas/i.test(
      generalText
    ) ||
    !/students must first compete in a Regional Fair and qualify/i.test(homeText)
  ) {
    return [];
  }

  return [
    {
      externalKey: `txsef-${headingMatch[1]}`,
      name: `${headingMatch[1]} Texas Science and Engineering Fair`,
      detailUrl,
      registrationUrl: null,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: null,
      participationMode: "in_person",
      venueName: "Texas A&M University Student Recreation Center",
      address: null,
      city: "College Station",
      state: "TX",
      zip: null,
      facets: ["science_fair"],
      eventType: "State science and engineering fair",
      availability:
        "official state fair dates published; regional qualification required",
      entryFeeCents: null,
    },
  ];
}
