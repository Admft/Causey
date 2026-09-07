import * as cheerio from "cheerio";
import {
  parseNamedDate,
  type RawCategoryEvent,
} from "./category-source-types";

export const CAC_DISTRICTS_URL =
  "https://www.congressionalappchallenge.us/students/participating-districts/";
export const CAC_RULES_URL =
  "https://www.congressionalappchallenge.us/students/rules/";

function bodyText(html: string): string {
  return cheerio
    .load(html)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One national submission window. Participating-district tables are ignored:
 * Causey does not emit a row per Member of Congress.
 *
 * The students homepage has published stale prior-year copy, so dates come
 * from the participating-districts page and eligibility/deadline confirmation
 * from the official rules HTML. PDFs are never fetched.
 */
export function parseCongressionalAppChallengeHtml(
  districtsHtml: string,
  rulesHtml: string,
  detailUrl = CAC_DISTRICTS_URL,
  deadlineSourceUrl = CAC_RULES_URL
): RawCategoryEvent[] {
  const districtsText = bodyText(districtsHtml);
  const rulesText = bodyText(rulesHtml);
  const window = districtsText.match(
    /The\s+(20\d{2})\s+Congressional App Challenge runs from\s+([A-Za-z]+)\s+(\d{1,2})\s+to\s+([A-Za-z]+)\s+(\d{1,2}),?\s+\1\b/i
  );
  if (!window) return [];
  const year = window[1];
  const start = parseNamedDate(`${window[2]} ${window[3]} ${year}`);
  const end = parseNamedDate(`${window[4]} ${window[5]} ${year}`);
  if (!start || !end || end < start) return [];
  if (
    !new RegExp(`${year}\\s+IMPORTANT DATES`, "i").test(rulesText) ||
    !/middle or high school student/i.test(rulesText) ||
    !/Deadline for students to register and submit/i.test(rulesText)
  ) {
    return [];
  }
  const deadlineMonthDay = `${window[4]} ${window[5]}`;
  if (
    !new RegExp(
      `${deadlineMonthDay.replace(/\s+/g, "\\s+")}\\s*[–-]\\s*Deadline`,
      "i"
    ).test(rulesText)
  ) {
    return [];
  }

  return [
    {
      externalKey: `congressional-app-challenge-${year}`,
      name: `${year} Congressional App Challenge`,
      detailUrl,
      registrationUrl: null,
      deadlineSourceUrl,
      dateSemantics: "submission_deadline",
      startDate: start,
      endDate: end,
      regDeadline: end,
      participationMode: "online",
      venueName: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      facets: ["computer_science"],
      eventType: "Congressional district app-submission challenge",
      availability:
        "official national submission window published; eligibility is middle or high school students in a participating congressional district",
      entryFeeCents: null,
    },
  ];
}
