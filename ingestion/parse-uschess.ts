/**
 * Pure HTML parsers for US Chess upcoming-tournaments + event detail pages.
 * Kept separate from the scrape runner so fixtures/tests can import them
 * without kicking off a network job.
 */
import { load, type CheerioAPI } from "cheerio";
import { extractPageImage } from "./extract-page-image";
import {
  parseDateRange,
  RawTlaSchema,
  SCRAPER_SITE,
  stateToCode,
  tlaExternalKey,
  type DetailEnrichment,
  type RawTla,
} from "./normalize";

export const LISTING_URL = SCRAPER_SITE;

/** Parse "City, StateName" or "City, ST" from the listing card. */
export function parseListingAddress(
  text: string
): { city: string; state: string } | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  for (let i = parts.length - 1; i >= 1; i--) {
    const code = stateToCode(parts[i]);
    if (code) {
      return { city: parts.slice(0, i).join(", "), state: code };
    }
  }
  return null;
}

export function parseListingHtml(html: string, baseUrl = LISTING_URL): RawTla[] {
  const $ = load(html);
  const raws: RawTla[] = [];

  $(".views-row").each((_, row) => {
    const root = $(row);
    const link = root.find("h3.title3 a, h3 a, .event-details a").first();
    const name = link.text().replace(/\s+/g, " ").trim();
    const href = link.attr("href");
    const addressText = root.find(".address").first().text().trim();
    const timeEl = root.find("time[datetime]").first();
    const dateText =
      timeEl.attr("datetime")?.trim() ||
      root.find(".dates").first().text().replace(/\s+/g, " ").trim();
    const organizerName =
      root.find(".organizer-name").first().text().replace(/\s+/g, " ").trim() || null;
    const blurb =
      root.find(".information").first().text().replace(/\s+/g, " ").trim() || null;

    if (!name || !href || !addressText || !dateText) return;
    const loc = parseListingAddress(addressText);
    if (!loc) {
      console.warn(`skip listing (bad address): ${addressText}`);
      return;
    }

    const detailUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    const candidate = {
      externalKey: tlaExternalKey(detailUrl),
      name,
      dateText,
      city: loc.city,
      state: loc.state,
      detailUrl,
      organizerName,
      blurb,
    };
    const parsed = RawTlaSchema.safeParse(candidate);
    if (parsed.success) raws.push(parsed.data);
    else console.warn(`skip listing (validation): ${JSON.stringify(candidate)}`);
  });

  return raws;
}

/** Highest page index linked from the pager (0-based). */
export function maxPagerPage($: CheerioAPI): number {
  let max = 0;
  $("nav.pager a[href*='page=']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

function absoluteHttpUrl(href: string | undefined, baseUrl?: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, baseUrl || LISTING_URL);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function eventSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Find a strict event-name match in an organizer sitemap. US Chess frequently
 * stores only the organizer homepage, while commerce-backed organizers expose
 * the actual entry page in sitemap.xml.
 */
export function findOrganizerEventUrlInSitemap(
  sitemapXml: string,
  eventName: string,
  organizerWebsite: string,
  eventDate?: string | null
): string | null {
  const slug = eventSlug(eventName);
  if (!slug) return null;
  const year = eventDate?.match(/\b(20\d{2})\b/)?.[1] ?? null;

  let organizerOrigin: string;
  try {
    organizerOrigin = new URL(organizerWebsite).origin;
  } catch {
    return null;
  }

  const $ = load(sitemapXml, { xmlMode: true });
  const candidates = $("url")
    .toArray()
    .map((entry) => {
      const loc = $(entry).find("loc").first().text().trim();
      const url = absoluteHttpUrl(loc, organizerWebsite);
      if (!url) return null;
      const parsed = new URL(url);
      if (parsed.origin !== organizerOrigin) return null;
      const leaf = decodeURIComponent(parsed.pathname)
        .split("/")
        .filter(Boolean)
        .pop();
      return {
        url,
        path: parsed.pathname,
        leaf: leaf ? eventSlug(leaf) : "",
        text: eventSlug($(entry).text()),
      };
    })
    .filter(
      (
        candidate
      ): candidate is { url: string; path: string; leaf: string; text: string } =>
        candidate !== null
    );

  const exactPath = candidates.find((candidate) => candidate.leaf === slug);
  if (exactPath) return exactPath.url;

  if (year) {
    const datedPath = candidates.find(
      (candidate) => candidate.leaf === `${slug}-${year}`
    );
    if (datedPath) return datedPath.url;
  }

  const eventPageMatches = candidates.filter(
    (candidate) =>
      /^\/(?:store\/p|fide-calendar|scholastic-calendar)\//.test(candidate.path) &&
      candidate.text.includes(slug) &&
      (!year || candidate.text.includes(year))
  );
  if (eventPageMatches.length === 1) return eventPageMatches[0]!.url;

  const titleMatches = candidates.filter(
    (candidate) =>
      /^\/(?:store\/p|fide-calendar|scholastic-calendar)\//.test(candidate.path) &&
      candidate.text.includes(slug)
  );
  return titleMatches.length === 1 ? titleMatches[0]!.url : null;
}

export function parseDetailHtml(html: string, pageUrl?: string): DetailEnrichment {
  const $ = load(html);
  const nodeId =
    $("[data-history-node-id]").first().attr("data-history-node-id")?.match(/^\d+$/)?.[0] ??
    html.match(/"currentPath"\s*:\s*"node\/(\d+)"/i)?.[1] ??
    null;

  const venueName =
    $(".views-field-field-event-location-name .field-content")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim() || null;

  const addrRoot = $(".views-field-field-event-address .address").first();
  const line1 = addrRoot.find(".address-line1").text().trim();
  const line2 = addrRoot.find(".address-line2").text().trim();
  const city = addrRoot.find(".locality").text().trim() || null;
  const stateRaw = addrRoot.find(".administrative-area").text().trim() || null;
  const zip = addrRoot.find(".postal-code").text().trim() || null;
  const addressParts = [line1, line2].filter(Boolean);
  const address = addressParts.length ? addressParts.join(", ") : null;

  const organizerWebsite =
    absoluteHttpUrl(
      $(".views-field-field-organizer-website a").first().attr("href")?.trim(),
      pageUrl
    );

  let registrationUrl: string | null = null;
  $(".views-field-body a[href]").each((_, anchor) => {
    if (registrationUrl) return;
    const label = $(anchor).text().replace(/\s+/g, " ").trim();
    if (!/register|registration|sign up|enter online/i.test(label)) return;
    registrationUrl = absoluteHttpUrl($(anchor).attr("href"), pageUrl);
  });

  const onlineText = $(".views-field-field-online-event .field-content")
    .first()
    .text()
    .trim()
    .toLowerCase();
  const online = onlineText === "yes" || onlineText === "true";

  const dateTimes = $(".views-field-field-event-dates time[datetime]")
    .toArray()
    .map((el) => $(el).attr("datetime") ?? "")
    .filter(Boolean)
    .map((dt) => parseDateRange(dt)?.start)
    .filter((d): d is string => Boolean(d));
  const endDate = dateTimes.length >= 2 ? dateTimes[dateTimes.length - 1]! : null;

  const imageUrl = extractPageImage(html, pageUrl || LISTING_URL);

  const bodyText =
    $(".views-field-body .field-content").first().text().replace(/\s+/g, " ").trim() ||
    null;

  return {
    sourceExternalKey: nodeId ? `uschess-node:${nodeId}` : null,
    venueName,
    address,
    city,
    state: stateRaw ? stateToCode(stateRaw) : null,
    zip: zip && /^\d{5}(-\d{4})?$/.test(zip) ? zip.slice(0, 5) : null,
    organizerWebsite,
    registrationUrl,
    online,
    endDate,
    imageUrl,
    bodyText,
  };
}
