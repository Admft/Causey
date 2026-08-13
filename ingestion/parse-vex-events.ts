import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { stateToCode } from "./normalize";
import {
  parseDashDate,
  type RawCategoryEvent,
} from "./category-source-types";

const BASE_URL =
  "https://events.vex.com/robot-competitions/vex-robotics-competition";

function eventFromContainer(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  listingUrl: string
): RawCategoryEvent | null {
  const container = $(element);
  const text = container.text().replace(/\s+/g, " ").trim();
  const code =
    container.attr("data-event-code") ??
    text.match(/\b(RE-[A-Z0-9-]+)\b/)?.[1] ??
    null;
  const href = container.find(`a[href*="${code ?? "RE-"}"]`).first().attr("href");
  const name =
    container.find("h2, h3, h4, [data-event-name]").first().text().trim() ||
    container.find("a").first().text().trim();
  const dateMatches = [...text.matchAll(/\b\d{1,2}-[A-Za-z]{3}-\d{4}\b/g)].map(
    (match) => parseDashDate(match[0])
  ).filter((date): date is string => Boolean(date));
  if (!code || !href || !name || dateMatches.length === 0) return null;

  const locationText =
    container.find("[data-location]").first().text().trim() ||
    text.match(/Location:\s*(.+?)(?:Event Region:|Event Code:|Type:|$)/i)?.[1]?.trim() ||
    "";
  const zip = locationText.match(/\b(\d{5})\b/)?.[1] ?? null;
  const stateName =
    locationText.match(/,\s*([A-Za-z ]+),?\s+\d{5}\b/)?.[1]?.trim() ?? "";
  const state = stateToCode(stateName);
  const city =
    locationText.match(/,\s*([^,]+),\s*[A-Za-z ]+,?\s+\d{5}\b/)?.[1]?.trim() ??
    null;
  const type = text.match(/Type:\s*(.+?)(?:Location:|Event Region:|$)/i)?.[1]?.trim() ?? null;
  const online = /remote|online/i.test(text) && !/in-person/i.test(text);
  const detailUrl = new URL(href, listingUrl).toString();
  const deadlineText =
    text.match(/Registration Deadline\s*:?\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i)?.[1] ??
    "";
  const price = text.match(/Price\s*\$([\d,.]+)/i)?.[1];

  return {
    externalKey: code,
    name,
    detailUrl,
    startDate: dateMatches[0],
    endDate: dateMatches[1] && dateMatches[1] >= dateMatches[0] ? dateMatches[1] : null,
    regDeadline: parseDashDate(deadlineText),
    participationMode: online ? "online" : "in_person",
    venueName: null,
    address: locationText || null,
    city: online ? null : city,
    state: online ? null : state,
    zip: online ? null : zip,
    facets: ["robotics"],
    eventType: type,
    availability: /canceled/i.test(text)
      ? "canceled"
      : /Status:\s*Open/i.test(text)
        ? "registration open"
        : /Status:\s*Closed/i.test(text)
          ? "registration closed"
          : "registration status not listed",
    entryFeeCents: price ? Math.round(Number(price.replace(/,/g, "")) * 100) : null,
  };
}

export function parseVexEventsHtml(
  html: string,
  listingUrl = BASE_URL
): RawCategoryEvent[] {
  const $ = cheerio.load(html);
  const events: RawCategoryEvent[] = [];
  const seen = new Set<string>();
  const containers = $("[data-event-code], article, li, .event-card");

  containers.each((_, element) => {
    const event = eventFromContainer($, element, listingUrl);
    if (!event || seen.has(event.externalKey)) return;
    seen.add(event.externalKey);
    events.push(event);
  });

  return events;
}
