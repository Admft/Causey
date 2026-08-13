import * as cheerio from "cheerio";
import {
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

export const TAEA_VASE_URL = "https://www.taea.org/vase/directors-dates.asp";

function parseLocation(text: string): {
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  const match = text.match(/\b([A-Za-z][A-Za-z .'-]+),\s*(TX)\s+(\d{5})\b/i);
  return {
    city: match?.[1]?.trim() ?? null,
    state: match?.[2]?.toUpperCase() ?? null,
    zip: match?.[3] ?? null,
  };
}

export function parseTaeaVaseHtml(
  html: string,
  listingUrl = TAEA_VASE_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const events: RawCategoryEvent[] = [];

  $("table tr").each((index, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;
    const name = cells.eq(0).text().replace(/\s+/g, " ").trim();
    const dates = parseNamedDateRange(cells.eq(1).text());
    if (!name || !dates) return;
    const href = cells.eq(0).find("a").attr("href");
    const detailUrl = href ? new URL(href, listingUrl).toString() : listingUrl;
    const locationText = cells.eq(2).text().replace(/\s+/g, " ").trim();
    const location = parseLocation(locationText);
    events.push({
      externalKey: href ?? `${dates.start}-${index}`,
      name,
      detailUrl,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: null,
      participationMode: "in_person",
      venueName: locationText || null,
      address: locationText || null,
      ...location,
      facets: ["visual_arts"],
      eventType: "Visual Arts Scholastic Event",
      availability: "event date published",
      entryFeeCents: null,
    });
  });

  if (events.length > 0) return events;

  $(".contentBox4a").each((_, box) => {
    const date = parseNamedDateRange($(box).find("strong").first().text());
    if (!date) return;
    $(box)
      .find("a[href^='#']")
      .each((_, link) => {
        const name = $(link).text().replace(/\s+/g, " ").trim();
        const href = $(link).attr("href");
        if (!name || !href || !/VASE|TEAM/i.test(name)) return;
        events.push({
          externalKey: `${href.slice(1)}-${date.start}`,
          name,
          detailUrl: new URL(href, listingUrl).toString(),
          startDate: date.start,
          endDate: null,
          regDeadline: null,
          participationMode: "in_person",
          venueName: null,
          address: null,
          city: null,
          state: "TX",
          zip: null,
          facets: ["visual_arts"],
          eventType: /JRVASE/i.test(name)
            ? "Junior VASE regional event"
            : /TEAM/i.test(name)
              ? "TEAM regional event"
              : "High School VASE regional event",
          availability: "event date published",
          entryFeeCents: null,
        });
      });
  });

  if (events.length > 0) return events;

  const pageText = $("body").text().replace(/\s+/g, " ").trim();
  const dates = parseNamedDateRange(pageText);
  const name = $("h1").first().text().replace(/\s+/g, " ").trim();
  const location = parseLocation(pageText);
  if (!dates || !/State VASE/i.test(name) || !location.city || !location.zip) {
    return [];
  }

  return [
    {
      externalKey: `state-vase-${dates.start}`,
      name,
      detailUrl: listingUrl,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: null,
      participationMode: "in_person",
      venueName:
        pageText.match(/Location\s+(.+?)(?:Date|A TAEA)/i)?.[1]?.trim() ?? null,
      address: null,
      ...location,
      facets: ["visual_arts"],
      eventType: "State VASE",
      availability: "event date published",
      entryFeeCents: null,
    },
  ];
}
