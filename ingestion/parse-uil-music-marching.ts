import * as cheerio from "cheerio";
import { isoDate, type RawCategoryEvent } from "./category-source-types";

export const UIL_MUSIC_MARCHING_STATE_URL =
  "https://www.uiltexas.org/music/marching-band/state";

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
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateList(
  text: string,
  year: number
): { start: string; end: string } | null {
  const tokens = text.match(
    /January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}/gi
  );
  if (!tokens) return null;

  let month: number | null = null;
  const dates: string[] = [];
  for (const token of tokens) {
    const namedMonth = MONTHS[token.toLowerCase()];
    if (namedMonth) {
      month = namedMonth;
      continue;
    }
    if (!month) return null;
    const date = isoDate(year, month, Number(token));
    if (!date) return null;
    dates.push(date);
  }
  if (dates.length === 0) return null;
  return { start: dates[0]!, end: dates.at(-1)! };
}

function classifications(value: string): string[] {
  return value.split("/").map((item) => item.trim());
}

export function parseUilMusicMarchingHtml(
  html: string,
  detailUrl = UIL_MUSIC_MARCHING_STATE_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const title = cleanText($("title").text());
  const bodyText = cleanText($("body").text());
  if (
    !/State Open Class Marching Band Contest/i.test(title) ||
    !/\bAlamodome:\s*San Antonio\b/i.test(bodyText)
  ) {
    return [];
  }

  const parsed: Array<{
    year: number;
    classes: string;
    dates: { start: string; end: string };
    future: boolean;
  }> = [];

  $("p").each((_, paragraph) => {
    const text = cleanText($(paragraph).text());
    const current = text.match(
      /^(20\d{2})\s+([1-6]A(?:\/[1-6]A)+)\s+Contests:\s+(.+?)\s+Alamodome:\s*San Antonio$/i
    );
    if (current) {
      const year = Number(current[1]);
      const dates = parseDateList(current[3], year);
      if (dates) {
        parsed.push({
          year,
          classes: current[2].toUpperCase(),
          dates,
          future: false,
        });
      }
      return;
    }

    const futurePattern =
      /((?:January|February|March|April|May|June|July|August|September|October|November|December)[^:]*?,\s*(20\d{2})):\s*([1-6]A(?:\/[1-6]A)+)\s+Contests:\s*Alamodome/gi;
    for (const match of text.matchAll(futurePattern)) {
      const year = Number(match[2]);
      const dateText = match[1].replace(/,\s*20\d{2}$/, "");
      const dates = parseDateList(dateText, year);
      if (!dates) continue;
      parsed.push({
        year,
        classes: match[3].toUpperCase(),
        dates,
        future: true,
      });
    }
  });

  const byIdentity = new Map<string, (typeof parsed)[number]>();
  for (const row of parsed) {
    byIdentity.set(`${row.year}-${row.classes}`, row);
  }
  const rows = [...byIdentity.values()];
  const rowsByYear = new Map<number, typeof rows>();
  for (const row of rows) {
    rowsByYear.set(row.year, [...(rowsByYear.get(row.year) ?? []), row]);
  }
  const expectedClasses = ["1A", "2A", "3A", "4A", "5A", "6A"];
  if (
    rows.length === 0 ||
    [...rowsByYear.values()].some((yearRows) => {
      const yearClasses = new Set(
        yearRows.flatMap((row) => classifications(row.classes))
      );
      return (
        yearRows.length !== 2 ||
        expectedClasses.some((classification) => !yearClasses.has(classification))
      );
    })
  ) {
    return [];
  }

  return rows
    .sort((a, b) => a.dates.start.localeCompare(b.dates.start))
    .map((row) => ({
      externalKey: `open-class-${row.classes.toLowerCase().replaceAll("/", "-")}-${row.year}`,
      name: `${row.year} UIL State Open Class Marching Band Contest (${row.classes})`,
      detailUrl,
      registrationUrl: null,
      startDate: row.dates.start,
      endDate: row.dates.end,
      regDeadline: null,
      participationMode: "in_person",
      venueName: "Alamodome",
      address: null,
      city: "San Antonio",
      state: "TX",
      zip: null,
      facets: ["music"],
      classifications: classifications(row.classes),
      eventType: `State Open Class Marching Band Contest — ${row.classes}`,
      availability: row.future
        ? "future state dates and venue published; detailed schedule pending"
        : "state schedule and venue published",
      entryFeeCents: null,
    }));
}
