import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { extractPageImage } from "./extract-page-image";
import { parseDateRange, stateToCode } from "./normalize";

export const TCA_LISTING_URL =
  "https://texaschess.org/tca-and-tca-club-events/";

const REGISTRAR_HOST =
  /kingregistration\.com|onlineregistration\.cc|chessstream\.com|austinchesstournaments|chessentry|formstack\.com|eventbrite\.com|google\.com\/forms|forms\.gle/i;

const STREET_SUFFIX =
  "Street|Road|Avenue|Drive|Boulevard|Lane|Court|Parkway|Blvd|Ave|Pkwy|Rd|Ln|Ct|Way|Dr|St";

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

/** Divi/WordPress often glues block text; repair common joins before parsing. */
function unglueAnnouncementText(value: string): string {
  return cleanText(
    value
      .replace(/(20\d{2})([A-Za-z])/g, "$1 $2")
      .replace(/([a-z.])(\d{1,6}\s+[A-Za-z])/gi, "$1 $2")
      .replace(/([A-Za-z])(\d{5})\b/g, "$1 $2")
  );
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

function firstMatching(
  $: cheerio.CheerioAPI,
  selectors: string[]
): cheerio.Cheerio<AnyNode> {
  for (const selector of selectors) {
    const match = $(selector).first();
    if (match.length) return match;
  }
  return $("body");
}

function readableContentText(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<AnyNode>
): string {
  const clone = root.clone();
  clone.find("script, style, noscript").remove();
  clone.find("br").replaceWith("\n");
  clone
    .find("p, div, h1, h2, h3, h4, h5, li, tr, section, header, footer, figure")
    .each((_, el) => {
      $(el).prepend("\n").append("\n");
    });
  return unglueAnnouncementText(clone.text());
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
  const cleaned = unglueAnnouncementText(text).replace(
    /(\d{1,2})(?:st|nd|rd|th)\b/gi,
    "$1"
  );

  // Ranges first. Do not require a trailing word boundary after the year —
  // Divi often glues the venue immediately after the end date (2026La Quinta).
  const rangeRe =
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})\s+(?:to|through|[-–])\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2})(?!\d)/gi;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRe.exec(cleaned))) {
    const start = parseDateRange(rangeMatch[1]!);
    const end = parseDateRange(rangeMatch[2]!);
    if (start && end) {
      return {
        dateText: rangeMatch[0],
        start: start.start,
        end: end.start,
      };
    }
  }

  // Ignore WordPress "Posted by … | Jun 20, 2026 |" before single-date fallback.
  const withoutPostMeta = cleaned.replace(
    /Posted by[\s\S]{0,120}?\|\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2}/gi,
    " "
  );
  const parsed = parseDateRange(withoutPostMeta);
  if (!parsed) return null;
  const dateText =
    withoutPostMeta.match(
      /\b[A-Za-z]{3,9}\s+\d{1,2}(?:\s*[-–]\s*(?:[A-Za-z]{3,9}\s+)?\d{1,2})?,?\s+20\d{2}(?!\d)/i
    )?.[0] ?? parsed.start;
  return { dateText, start: parsed.start, end: parsed.end };
}

function parseTcaLocation(bodyText: string): {
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  const streetRe = new RegExp(
    `\\b(\\d{1,6}\\s+[A-Za-z0-9 .'#/-]{2,70}?\\b(?:${STREET_SUFFIX})\\.?)(?:,)?\\s+([A-Za-z .'-]{2,50}),?\\s*(Texas|TX)\\s+(\\d{5})(?:-\\d{4})?\\b`,
    "i"
  );
  const addressMatch = bodyText.match(streetRe);
  const cityZipMatch = bodyText.match(
    /\b([A-Za-z .'-]{2,50}),?\s*(Texas|TX)\s+(\d{5})(?:-\d{4})?\b/i
  );

  const city =
    cleanText(addressMatch?.[2] ?? cityZipMatch?.[1] ?? "") || null;
  const stateRaw = addressMatch?.[3] ?? cityZipMatch?.[2] ?? "";
  const zip = addressMatch?.[4] ?? cityZipMatch?.[3] ?? null;
  const address = addressMatch ? cleanText(addressMatch[1]!) : null;

  let venueName: string | null = null;
  if (address) {
    const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = bodyText.match(
      new RegExp(
        `([A-Za-z0-9][A-Za-z0-9 &.'/-]{3,90}?(?:Inn|Hotel|Suites|School|Center|Centre|Church|Library|Hall|Campus|University|College|Club|Academy|Riverwalk))\\s+${escaped}`,
        "i"
      )
    );
    if (before?.[1]) {
      venueName = cleanText(before[1])
        .replace(/^(?:to|through)\s+/i, "")
        .replace(/^20\d{2}\s+/, "");
    }
  }

  return {
    venueName,
    address,
    city,
    state: stateToCode(stateRaw),
    zip,
  };
}

function parseTcaRegistrationUrl(
  $: cheerio.CheerioAPI,
  pageUrl: string
): string | null {
  let registrationUrl: string | null = null;
  let registrarFallback: string | null = null;

  $("a[href]").each((_, element) => {
    if (registrationUrl) return;
    const link = $(element);
    const label = cleanText(link.text());
    const href = absoluteUrl(link.attr("href"), pageUrl);
    if (!href || href.startsWith("mailto:")) return;

    if (/register|registration|entry form|sign up|online entry/i.test(label)) {
      registrationUrl = href;
      return;
    }
    if (!registrarFallback && REGISTRAR_HOST.test(href)) {
      registrarFallback = href;
    }
  });

  return registrationUrl ?? registrarFallback;
}

export function parseTcaDetailHtml(
  html: string,
  pageUrl: string
): TcaDetail {
  const $ = cheerio.load(html);
  // Try selectors in priority order — jQuery `.first()` is document order, not
  // selector-list order, so `#main-content` must not win over the article body.
  const content = firstMatching($, [
    "article .entry-content",
    "article .post-content",
    ".et_pb_post_content",
    "article",
    "#main-content",
  ]);
  const bodyText = readableContentText($, content);
  const dates = parseTcaDateRange(bodyText);
  const location = parseTcaLocation(bodyText);
  const registrationUrl = parseTcaRegistrationUrl($, pageUrl);

  return {
    dateText: dates?.dateText ?? null,
    startDate: dates?.start ?? null,
    endDate: dates?.end ?? null,
    venueName: location.venueName,
    address: location.address,
    city: location.city,
    state: location.state,
    zip: location.zip,
    registrationUrl,
    imageUrl: extractPageImage(html, pageUrl),
    bodyText,
    onlineOnly:
      /\b(?:online[- ]only|online chess tournament|played online)\b/i.test(
        bodyText
      ) && !location.address,
  };
}
