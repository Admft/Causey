import { load } from "cheerio";

/**
 * Pull a usable cover image from a scraped HTML page.
 *
 * Prefer Open Graph / Twitter cards, then a large-looking content image.
 * Return null liberally — a missing image is better than a favicon,
 * banner ad, or site chrome showing up as a tournament photo.
 */

const REJECT_URL_RE =
  /favicon|sprite|pixel|tracking|1x1|badge|button|icon[-_]?|logo|avatar|emoji|spinner|placeholder|clo-logo|banner|advert|ad[-_]?banner|stalemate-save|uscfsales|uschess\.org\/sites\/default\/files\/favicons/i;

const REJECT_ALT_RE = /banner\s*ad|advertisement|sponsor|us\s*chess\s*sales/i;

function absolutize(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href.trim(), baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function looksUsable(url: string, alt?: string | null): boolean {
  if (!url || url.startsWith("data:")) return false;
  if (REJECT_URL_RE.test(url)) return false;
  if (alt && REJECT_ALT_RE.test(alt)) return false;
  // Tiny SVGs are almost always icons; raster covers are what we want.
  if (/\.svg(\?|#|$)/i.test(url)) return false;
  return true;
}

function bestSrcsetCandidate(raw: string | undefined): string | null {
  if (!raw) return null;
  const candidates = raw
    .split(",")
    .map((part) => {
      const [url, descriptor = ""] = part.trim().split(/\s+/, 2);
      const score = Number(descriptor.replace(/[^\d.]/g, "")) || 0;
      return { url, score };
    })
    .filter((candidate) => candidate.url)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.url ?? null;
}

function metaContent($: ReturnType<typeof load>, selectors: string[]): string | null {
  for (const sel of selectors) {
    const content = $(sel).first().attr("content")?.trim();
    if (content) return content;
  }
  return null;
}

/**
 * @param html  Page HTML
 * @param baseUrl  Page URL used to resolve relative image paths
 */
export function extractPageImage(html: string, baseUrl: string): string | null {
  const $ = load(html);

  const metaCandidates = [
    metaContent($, [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image:url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]),
  ].filter(Boolean) as string[];

  for (const raw of metaCandidates) {
    const abs = absolutize(raw, baseUrl);
    if (abs && looksUsable(abs)) return abs;
  }

  // Drupal / event body images — skip nav/header chrome.
  const contentImgs = $(
    "article img, .field--name-body img, .field-name-body img, main img, .content img"
  ).toArray();

  for (const el of contentImgs) {
    const img = $(el);
    const src =
      bestSrcsetCandidate(
        img.attr("srcset") || img.attr("data-srcset") || img.attr("data-lazy-srcset")
      ) ||
      img.attr("data-lazy-src")?.trim() ||
      img.attr("data-src")?.trim() ||
      img.attr("src")?.trim();
    if (!src) continue;

    const w = Number(img.attr("width") || 0);
    const h = Number(img.attr("height") || 0);
    if ((w > 0 && w < 120) || (h > 0 && h < 80)) continue;

    const alt = img.attr("alt") ?? null;
    const abs = absolutize(src, baseUrl);
    if (abs && looksUsable(abs, alt)) return abs;
  }

  return null;
}
