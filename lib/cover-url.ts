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

/** Google Sites srcset uses this as "original size"; the CDN often 400s/403s it. */
const GOOGLE_SITES_MAX_WIDTH_RE = /=w16383(?:-[a-z0-9]+)*$/i;

export function isSourceChromeCoverUrl(src: string): boolean {
  if (!src || src.startsWith("data:")) return true;
  if (/\.svg(\?|#|$)/i.test(src)) return true;
  return SOURCE_CHROME_COVER_RE.test(src);
}

function hostOf(src: string): string | null {
  try {
    return new URL(src).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Signed Google Sites / Facebook CDN covers expire or refuse hotlinking.
 * Scrapes copy these into tournament-covers so cards keep a real photo.
 */
export function isEphemeralCoverUrl(src: string | null | undefined): boolean {
  const host = src ? hostOf(src) : null;
  if (!host) return false;
  return (
    host.endsWith("googleusercontent.com") ||
    host.endsWith("ggpht.com") ||
    host.endsWith("fbcdn.net")
  );
}

/** Cover already stored on Causey's public tournament-covers bucket. */
export function isHostedCoverUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase().includes("supabase.co") &&
      url.pathname.includes("/storage/v1/object/public/tournament-covers/")
    );
  } catch {
    return false;
  }
}

/** Drop the Google Sites "original" width that the CDN does not serve. */
export function stripGoogleSitesMaxWidth(src: string): string {
  return src.replace(GOOGLE_SITES_MAX_WIDTH_RE, "");
}

export function toDisplayCoverUrl(
  src: string | null | undefined
): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol === "https:") {
      return stripGoogleSitesMaxWidth(src);
    }
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return stripGoogleSitesMaxWidth(url.toString());
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * URLs to try when fetching a cover. Google Sites often 400s `=w16383`
 * while the same token without a size suffix still serves.
 */
export function coverFetchCandidates(
  src: string | null | undefined
): string[] {
  const display = toDisplayCoverUrl(src);
  if (!display) return [];
  const originalHttps = (() => {
    if (!src) return null;
    try {
      const url = new URL(src);
      if (url.protocol === "http:") url.protocol = "https:";
      if (url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  })();
  const unique = [display];
  if (originalHttps && originalHttps !== display) unique.push(originalHttps);
  return unique;
}

/** HTTPS cover that is a real event photo, not a source logo or OG default. */
export function organizerCoverUrl(
  src: string | null | undefined
): string | null {
  const display = toDisplayCoverUrl(src);
  if (!display || isSourceChromeCoverUrl(display)) return null;
  return display;
}
