import { extractPageImage } from "./extract-page-image";
import { fetchPublicHtml } from "./fetch-html";
import { findOrganizerEventUrlInSitemap } from "./parse-uschess";
import type { DetailEnrichment } from "./normalize";

const DETAIL_DELAY_MS = 350;
const organizerPageCache = new Map<string, Promise<string | null>>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cachedOrganizerFetch(url: string): Promise<string | null> {
  const cached = organizerPageCache.get(url);
  if (cached) return cached;
  const request = (async () => {
    try {
      await sleep(DETAIL_DELAY_MS);
      return await fetchPublicHtml(url);
    } catch {
      return null;
    }
  })();
  organizerPageCache.set(url, request);
  return request;
}

/**
 * US Chess pages rarely have an event photo. Pull one from the organizer
 * site when the TLA record points at a homepage or registration page.
 */
export async function enrichCoverFromOrganizerSite(
  detail: DetailEnrichment,
  eventName: string,
  eventDate: string
): Promise<void> {
  if (!detail.organizerWebsite || detail.imageUrl) return;

  const homepageHtml = await cachedOrganizerFetch(detail.organizerWebsite);
  if (!homepageHtml) return;

  // Squarespace product/event pages are reliably listed in sitemap.xml even
  // when the US Chess record provides only the organizer homepage.
  if (!detail.registrationUrl && /squarespace/i.test(homepageHtml)) {
    const sitemapUrl = new URL("/sitemap.xml", detail.organizerWebsite).toString();
    const sitemapXml = await cachedOrganizerFetch(sitemapUrl);
    if (sitemapXml) {
      detail.registrationUrl = findOrganizerEventUrlInSitemap(
        sitemapXml,
        eventName,
        detail.organizerWebsite,
        eventDate
      );
    }
  }

  const eventUrl = detail.registrationUrl;
  if (eventUrl && !/uschess\.org/i.test(eventUrl)) {
    const eventHtml = await cachedOrganizerFetch(eventUrl);
    if (eventHtml) {
      detail.imageUrl = extractPageImage(eventHtml, eventUrl);
    }
  }
  if (!detail.imageUrl) {
    detail.imageUrl = extractPageImage(homepageHtml, detail.organizerWebsite);
  }
}
