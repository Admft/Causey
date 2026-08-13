import * as cheerio from "cheerio";
import { stateToCode } from "./normalize";
import {
  parseNamedDate,
  parseNamedDateRange,
  type RawCategoryEvent,
} from "./category-source-types";

const BASE_URL = "https://www.tabroom.com";

export function tabroomFacets(eventsText: string): string[] {
  const tokens = new Set(
    eventsText
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter(Boolean)
  );
  const facets = new Set<string>();
  if ([...tokens].some((token) => token === "PF" || token === "NPF" || token === "VPF")) {
    facets.add("public_forum");
  }
  if ([...tokens].some((token) => token === "LD" || token === "NLD" || token === "VLD")) {
    facets.add("lincoln_douglas");
  }
  if ([...tokens].some((token) => token === "CX" || token === "NCX" || token === "VCX")) {
    facets.add("policy");
  }
  if ([...tokens].some((token) => token === "CD" || token === "CON" || token === "CONG")) {
    facets.add("congress");
  }
  if ([...tokens].some((token) => token === "WSD" || token === "WS")) {
    facets.add("world_schools");
  }
  if (
    [...tokens].some((token) =>
      ["DI", "DUO", "HI", "INFO", "IX", "OO", "POI", "PR", "DX"].includes(token)
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
