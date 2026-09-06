/**
 * Same rules as website `lib/cover-url.ts`: HTTPS display URLs, no source
 * logos or FIDE/US Chess Open Graph defaults as the event photo.
 */

const SOURCE_CHROME_COVER_RE =
  /favicon|sprite|pixel|tracking|1x1|badge|button|icon[-_]?|logo|avatar|emoji|spinner|placeholder|clo-logo|banner|advert|ad[-_]?banner|stalemate-save|uscfsales|uschess\.org\/sites\/default\/files\/favicons|fide_og|directory\.fide\.com\/img|\/sources\//i;

const GOOGLE_SITES_MAX_WIDTH_RE = /=w16383(?:-[a-z0-9]+)*$/i;

function isSourceChromeCoverUrl(src: string): boolean {
  if (!src || src.startsWith("data:")) return true;
  if (/\.svg(\?|#|$)/i.test(src)) return true;
  return SOURCE_CHROME_COVER_RE.test(src);
}

export function toDisplayCoverUrl(
  src: string | null | undefined
): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol === "https:") {
      return src.replace(GOOGLE_SITES_MAX_WIDTH_RE, "");
    }
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.toString().replace(GOOGLE_SITES_MAX_WIDTH_RE, "");
    }
    return null;
  } catch {
    return null;
  }
}

export function organizerCoverUrl(
  src: string | null | undefined
): string | null {
  const display = toDisplayCoverUrl(src);
  if (!display || isSourceChromeCoverUrl(display)) return null;
  return display;
}
