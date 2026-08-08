import * as cheerio from "cheerio";
import { extractPageImage } from "./extract-page-image";
import { parseDateRange, stateToCode } from "./normalize";

export const TCA_LISTING_URL =
  "https://texaschess.org/tca-and-tca-club-events/";

export type RawTcaEvent = {
  externalKey: string;
  name: string;
  detailUrl: string;
  excerpt: string;
  /** Raw card image reference, including browser-saved fixture paths. */
  imageReference: string | null;
  /** Persistable web URL only; local `_files/` fixture rewrites become null. */
  imageUrl: string | null;
};

export type TcaDetail = {
  dateText: string | null;
  startDate: string | null;
  endDate: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  registrationUrl: string | null;
  imageUrl: string | null;
  bodyText: string;
  onlineOnly: boolean;
};

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(raw: string | undefined, baseUrl: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), baseUrl);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseTcaListingHtml(
  html: string,
  baseUrl = TCA_LISTING_URL
): RawTcaEvent[] {
  const $ = cheerio.load(html);
  const rows: RawTcaEvent[] = [];
  const seen = new Set<string>();

  $("article.category-tca-tournament-announcements, article.type-post").each(
    (_, element) => {
      const article = $(element);
      const titleLink = article.find(".post-title a, h2.entry-title a").first();
      const name = cleanText(titleLink.text());
      const detailUrl = absoluteUrl(titleLink.attr("href"), baseUrl);
      if (!detailUrl || name.length < 3 || seen.has(detailUrl)) return;

      const articleId = article.attr("id")?.match(/\d+/)?.[0];
      const pathKey = new URL(detailUrl).pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .pop();
      const externalKey = articleId || pathKey || detailUrl;
      const image = article.find(".featured-image img, .header img").first();
      const imageReference =
        image.attr("src") ||
        image.attr("data-src") ||
        image.attr("data-lazy-src") ||
        null;
      const imageUrl =
        imageReference && !/_files[\\/]/i.test(imageReference)
          ? absoluteUrl(imageReference, baseUrl)
          : null;
      const excerpt = cleanText(
        article.find(".excerpt p, .entry-summary p").first().text()
      );

      seen.add(detailUrl);
      rows.push({
        externalKey,
        name,
        detailUrl,
        excerpt,
        imageReference,
        imageUrl,
      });
    }
  );

  return rows;
}

export function parseTcaNextPageUrl(
  html: string,
  baseUrl = TCA_LISTING_URL
): string | null {
  const $ = cheerio.load(html);
  return absoluteUrl(
    $(".archive-pagination a.next, a.next.page-numbers").first().attr("href"),
    baseUrl
  );
}

export function parseTcaDateRange(text: string): {
  dateText: string;
  start: string;
  end: string | null;
} | null {
  const cleaned = cleanText(text).replace(
    /(\d{1,2})(?:st|nd|rd|th)\b/gi,
    "$1"
  );
  const fullRange = cleaned.match(
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})\s+(?:to|through|[-–])\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})\b/i
  );
  if (fullRange) {
    const start = parseDateRange(fullRange[1]);
    const end = parseDateRange(fullRange[2]);
    if (start && end) {
      return {
        dateText: fullRange[0],
        start: start.start,
        end: end.start,
      };
    }
  }

  const parsed = parseDateRange(cleaned);
  if (!parsed) return null;
  const dateText =
    cleaned.match(
      /\b[A-Za-z]{3,9}\s+\d{1,2}(?:\s*[-–]\s*(?:[A-Za-z]{3,9}\s+)?\d{1,2})?,?\s+20\d{2}\b/i
    )?.[0] ?? parsed.start;
  return { dateText, start: parsed.start, end: parsed.end };
}

export function parseTcaDetailHtml(
  html: string,
  pageUrl: string
): TcaDetail {
  const $ = cheerio.load(html);
  const content = $(
    "article .entry-content, article .post-content, .et_pb_post_content, #main-content"
  ).first();
  const bodyText = cleanText(content.length ? content.text() : $("body").text());
  const dates = parseTcaDateRange(bodyText);

  const addressMatch = bodyText.match(
    /\b(\d{1,6}\s+[A-Za-z0-9 .'#/-]{2,70}?\b(?:Street|Road|Avenue|Drive|Boulevard|Lane|Court|Parkway|Blvd|Ave|Pkwy|Rd|Ln|Ct|Way|Dr|St)\.?),?\s+([A-Za-z .'-]{2,50}),\s*(Texas|TX)\s+(\d{5})(?:-\d{4})?\b/i
  );
  const cityZipMatch = bodyText.match(
    /\b([A-Za-z .'-]{2,50}),\s*(Texas|TX)\s+(\d{5})(?:-\d{4})?\b/i
  );
  const city = cleanText(addressMatch?.[2] ?? cityZipMatch?.[1] ?? "") || null;
  const stateRaw = addressMatch?.[3] ?? cityZipMatch?.[2] ?? "";
  const zip = addressMatch?.[4] ?? cityZipMatch?.[3] ?? null;

  let registrationUrl: string | null = null;
  $("a[href]").each((_, element) => {
    if (registrationUrl) return;
    const link = $(element);
    const label = cleanText(link.text());
    const href = absoluteUrl(link.attr("href"), pageUrl);
    if (
      href &&
      /register|registration|entry form|sign up/i.test(label) &&
      !href.startsWith("mailto:")
    ) {
      registrationUrl = href;
    }
  });

  return {
    dateText: dates?.dateText ?? null,
    startDate: dates?.start ?? null,
    endDate: dates?.end ?? null,
    venueName: null,
    address: addressMatch ? cleanText(addressMatch[1]) : null,
    city,
    state: stateToCode(stateRaw),
    zip,
    registrationUrl,
    imageUrl: extractPageImage(html, pageUrl),
    bodyText,
    onlineOnly:
      /\b(?:online[- ]only|online chess tournament|played online)\b/i.test(
        bodyText
      ) && !addressMatch,
  };
}
