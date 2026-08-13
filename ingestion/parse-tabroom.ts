import * as cheerio from "cheerio";
import { stateToCode } from "./normalize";
import {
  parseNamedDate,
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

const BASE_URL = "https://www.tabroom.com";

export function tabroomFacets(eventsText: string): string[] {
  const tokens = [
    ...new Set(
    eventsText
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter(Boolean)
    ),
  ];
  const hasToken = (pattern: RegExp) => tokens.some((token) => pattern.test(token));
  const facets = new Set<string>();
  if (hasToken(/^(?:N|V|JV|C)?PF(?:D|L|CH)?$/)) {
    facets.add("public_forum");
  }
  if (hasToken(/^(?:N|V|JV|C)?LD(?:UIL|RR|CH|L)?$/)) {
    facets.add("lincoln_douglas");
  }
  if (hasToken(/^(?:N|V|JV|C)?CX(?:RR|CH|L)?$/)) {
    facets.add("policy");
  }
  if (
    hasToken(
      /^(?:CD|NCD|VCD|CON|CONG|NCONG|CONGC|CONGL|NCONL|ACOCON|NACON|SMCD|FFCD|RCD|WCD)$/
    )
  ) {
    facets.add("congress");
  }
  if (hasToken(/^(?:[A-Z]{0,3})?WSD(?:C|L|CH)?$|^WS$/)) {
    facets.add("world_schools");
  }
  if (
    hasToken(
      /^(?:[A-Z]{0,3})?(?:DI|DUO|DUET|HI|INFO|INF|IX|DX|NX|FX|OO|OI|POI|POE|PO|PR|PRO|DA|IMP|DEC|USX)(?:CH|L|C|M|S)?$/
    )
  ) {
    facets.add("speech");
  }
  return [...facets];
}

export function parseTabroomHtml(
  html: string,
  listingUrl = `${BASE_URL}/index/index.mhtml`
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const events: RawCategoryEvent[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;
    const link = cells.eq(0).find("a[href*='tourn_id']").first();
    const name = link.text().replace(/\s+/g, " ").trim() || cells.eq(0).text().trim();
    const href = link.attr("href");
    const dateText = cells.eq(2).text().replace(/\s+/g, " ").trim();
    const dates = parseNamedDateRange(dateText);
    if (!name || !href || !dates) return;

    const detailUrl = new URL(href, listingUrl).toString();
    const externalKey =
      new URL(detailUrl).searchParams.get("tourn_id") ?? detailUrl;
    const location = cells.eq(1).text().replace(/\s+/g, " ").trim();
    const online = /NSDA Campus|online|virtual/i.test(location);
    const locationParts = location.split(",").map((part) => part.trim());
    const state = online
      ? null
      : stateToCode(locationParts.at(-1) ?? "") ??
        (/^[A-Z]{2}$/.test(locationParts.at(-1) ?? "")
          ? locationParts.at(-1)!
          : null);
    const city = online ? null : locationParts.slice(0, -1).join(", ") || null;
    const eventText = cells.eq(3).text().replace(/\s+/g, " ").trim();

    events.push({
      externalKey,
      name,
      detailUrl,
      startDate: dates.start,
      endDate: dates.end,
      regDeadline: parseNamedDate(cells.eq(5).text()),
      participationMode: online ? "online" : "in_person",
      venueName: online ? "NSDA Campus" : null,
      address: null,
      city,
      state,
      zip: null,
      facets: tabroomFacets(eventText),
      eventType: eventText || null,
      availability: cells.eq(5).text().trim()
        ? "registration dates published"
        : "registration status not listed",
      entryFeeCents: null,
    });
  });

  return events;
}
