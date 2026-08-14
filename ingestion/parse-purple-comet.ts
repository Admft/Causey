import * as cheerio from "cheerio";
import { isoDate, type RawCategoryEvent } from "./category-source-types";

export const PURPLE_COMET_URL = "https://www.purplecomet.org/";
export const PURPLE_COMET_RULES_URL =
  "https://purplecomet.org/index.php/rules";

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseOfficialWindow(
  text: string
): { start: string; end: string } | null {
  const match = text.match(
    /next Purple Comet!\s*(?:Math Meet\s*)?contest will take place\s+(?:[A-Za-z]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\s+through\s+(?:[A-Za-z]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/i
  );
  if (!match) return null;
  const startMonth = MONTHS[match[2].toLowerCase()];
  const endMonth = MONTHS[match[5].toLowerCase()];
  if (!startMonth || !endMonth) return null;
  const start = isoDate(Number(match[3]), startMonth, Number(match[1]));
  const end = isoDate(Number(match[6]), endMonth, Number(match[4]));
  if (!start || !end || start.slice(0, 4) !== end.slice(0, 4) || end < start) {
    return null;
  }
  return { start, end };
}

export function parsePurpleCometHtml(
  homeHtml: string,
  rulesHtml: string,
  detailUrl = PURPLE_COMET_URL
): RawCategoryEvent[] {
  const home = cheerio.load(homeHtml);
  const rules = cheerio.load(rulesHtml);
  const homeText = cleanText(home("body").text());
  const rulesText = cleanText(rules("body").text());
  const dates = parseOfficialWindow(homeText);
  if (
    !/PurpleComet/i.test(cleanText(home("title").text())) ||
    !dates ||
    !/free,\s*annual,\s*international,\s*online,\s*team,\s*mathematics competition designed for middle and high school students/i.test(
      rulesText
    ) ||
    !/Each team is required to have an adult supervisor/i.test(rulesText) ||
    !/contest is free to all participants/i.test(rulesText)
  ) {
    return [];
  }

  const year = dates.start.slice(0, 4);
  return [
    {
      externalKey: `purple-comet-${year}`,
      name: `${year} Purple Comet! Math Meet`,
      detailUrl,
      // Registration requires a supervisor account. Causey does not fetch or
      // direct students into that login surface.
      registrationUrl: null,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: null,
      participationMode: "online",
      venueName: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      facets: ["mathematics", "math_team"],
      eventType: "International online team mathematics competition",
      availability:
        "official contest window published; adult supervisor and team registration required",
      entryFeeCents: 0,
    },
  ];
}
