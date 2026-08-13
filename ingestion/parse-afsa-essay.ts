import * as cheerio from "cheerio";
import {
  parseNamedDate,
  type RawCategoryEvent,
} from "./category-source-types";

export const AFSA_ESSAY_URL = "https://afsa.org/essay-contest";
export const AFSA_CHECKLIST_URL = "https://afsa.org/writers-checklist";

function officialSubmissionUrl(
  html: string,
  detailUrl: string
): string | null {
  const $ = cheerio.load(html);
  const href = $("a")
    .filter((_, element) =>
      /\b(submit|submission|enter)\b/i.test($(element).text())
    )
    .first()
    .attr("href");
  if (!href) return null;
  try {
    return new URL(href, detailUrl).toString();
  } catch {
    return null;
  }
}

/**
 * AFSA separates the cycle identity and deadline across two official pages.
 * Both must agree on the ending year before Causey emits a row.
 */
export function parseAfsaEssayHtml(
  contestHtml: string,
  checklistHtml: string,
  detailUrl = AFSA_ESSAY_URL,
  deadlineSourceUrl = AFSA_CHECKLIST_URL
): RawCategoryEvent[] {
  const contestText = cheerio
    .load(contestHtml)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const checklistText = cheerio
    .load(checklistHtml)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const cycle = contestText.match(
    /AFSA National High School Essay Contest\s+(20\d{2})\s*[-–]\s*(20\d{2})\b/i
  );
  const deadlineText =
    checklistText.match(
      /Deadline:\s*(?:11:59\s+p\.?m\.?\s+[A-Z]{2,4},?\s*)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
    )?.[1] ?? "";
  const deadline = parseNamedDate(deadlineText);
  if (!cycle || !deadline || !deadline.startsWith(`${cycle[2]}-`)) return [];
  if (!/grades?\s+(?:nine|9)\s+through\s+(?:twelve|12)/i.test(contestText)) {
    return [];
  }

  const closed = /submission window[^.]*\bclosed\b/i.test(contestText);
  const open = /submission(?:s| window)?[^.]*\bopen\b/i.test(contestText);
  if (!closed && !open) return [];

  return [
    {
      externalKey: `essay-contest-${cycle[1]}-${cycle[2]}`,
      name: `${cycle[1]}–${cycle[2]} AFSA National High School Essay Contest`,
      detailUrl,
      registrationUrl: closed
        ? null
        : officialSubmissionUrl(contestHtml, detailUrl),
      deadlineSourceUrl,
      dateSemantics: "submission_deadline",
      startDate: deadline,
      endDate: deadline,
      regDeadline: deadline,
      participationMode: "online",
      venueName: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      facets: ["essay"],
      eventType: "Essay contest",
      availability: closed
        ? "submissions closed; exact official cycle and deadline published"
        : "submissions open; exact official cycle and deadline published",
      entryFeeCents: null,
    },
  ];
}
