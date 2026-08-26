/**
 * Listing covers are scraped from organizer pages. Older rows and some
 * CDNs still store `http://` URLs. The app CSP only allows `https:` images
 * (and a production HTTPS page would mix-content-block HTTP anyway), so
 * every display path upgrades before the <img> is rendered.
 */

/**
 * Site chrome that scrapers and the homepage strip must not treat as a
 * tournament photo: favicons, source wordmarks, FIDE/US Chess OG defaults.
 */
const SOURCE_CHROME_COVER_RE =
  /favicon|sprite|pixel|tracking|1x1|badge|button|icon[-_]?|logo|avatar|emoji|spinner|placeholder|clo-logo|banner|advert|ad[-_]?banner|stalemate-save|uscfsales|uschess\.org\/sites\/default\/files\/favicons|fide_og|directory\.fide\.com\/img|\/sources\//i;

export function isSourceChromeCoverUrl(src: string): boolean {
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
    if (url.protocol === "https:") return src;
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/** HTTPS cover that is a real event photo, not a source logo or OG default. */
export function organizerCoverUrl(
  src: string | null | undefined
): string | null {
  const display = toDisplayCoverUrl(src);
  if (!display || isSourceChromeCoverUrl(display)) return null;
  return display;
}
