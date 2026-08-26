/**
 * Listing covers are scraped from organizer pages. Older rows and some
 * CDNs still store `http://` URLs. The app CSP only allows `https:` images
 * (and a production HTTPS page would mix-content-block HTTP anyway), so
 * every display path upgrades before the <img> is rendered.
 */
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
