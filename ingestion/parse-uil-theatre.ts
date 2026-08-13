import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

export const UIL_THEATRE_STATE_URL =
  "https://www.uiltexas.org/theatre/state";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function headingParagraph(
  $: cheerio.CheerioAPI,
  headingPattern: RegExp
): string | null {
  const heading = $("h2")
    .filter((_, element) => headingPattern.test(cleanText($(element).text())))
    .first();
  if (heading.length === 0) return null;
  const paragraph = heading.nextAll("p").first();
  return paragraph.length > 0 ? cleanText(paragraph.text()) : null;
}

export function parseUilTheatreHtml(
  html: string,
  detailUrl = UIL_THEATRE_STATE_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const title = cleanText($("title").text());
  const bodyText = cleanText($("body").text());
  if (
    !/State Meet.*High School One-Act Play|High School One-Act Play.*State Meet/i.test(
      title
    ) ||
    !/\*?Tentative\*?\s+SCHEDULE/i.test(bodyText) ||
    !/\bAustin,\s*TX\b/i.test(bodyText)
  ) {
    return [];
  }

  const oneActText = headingParagraph($, /^One-Act Play State Meet$/i);
  const oneActMatch = oneActText?.match(
    /1A\s*[-–]\s*3A\s*[•·]\s*(.+?)\s+4A\s*[-–]\s*6A\s*[•·]\s*(.+)$/i
  );
  const lowerConferences = oneActMatch
    ? parseNamedDateRange(oneActMatch[1])
    : null;
  const upperConferences = oneActMatch
    ? parseNamedDateRange(oneActMatch[2])
    : null;
  const designText = headingParagraph($, /^Theatrical Design State Meet$/i);
  const designDates = designText ? parseNamedDateRange(designText) : null;

  const datedEvents = [
    {
      key: "one-act-play-1a-3a",
      label: "UIL One-Act Play State Meet (Conferences 1A–3A)",
      dates: lowerConferences,
      eventType: "High School One-Act Play State Meet",
    },
    {
      key: "theatrical-design",
      label: "UIL Theatrical Design State Meet",
      dates: designDates,
      eventType: "High School Theatrical Design State Meet",
    },
    {
      key: "one-act-play-4a-6a",
      label: "UIL One-Act Play State Meet (Conferences 4A–6A)",
      dates: upperConferences,
      eventType: "High School One-Act Play State Meet",
    },
  ] as const;

  const years = new Set(
    datedEvents.flatMap((event) =>
      event.dates ? [event.dates.start.slice(0, 4)] : []
    )
  );
  if (
    datedEvents.some((event) => !event.dates || !event.dates.end) ||
    years.size !== 1
  ) {
    return [];
  }

  const [year] = years;
  return datedEvents.map((event) => ({
    externalKey: `${event.key}-${year}`,
    name: `${year} ${event.label}`,
    detailUrl,
    registrationUrl: null,
    startDate: event.dates!.start,
    endDate: event.dates!.end,
    regDeadline: null,
    participationMode: "in_person",
    venueName: null,
    address: null,
    city: "Austin",
    state: "TX",
    zip: null,
    facets: ["theatre"],
    eventType: event.eventType,
    availability:
      "tentative state schedule published; participation limited to UIL state qualifiers",
    entryFeeCents: null,
  }));
}
