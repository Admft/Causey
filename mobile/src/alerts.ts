function hrefPathname(href: string): string {
  const withoutOrigin = href.replace(/^https?:\/\/[^/]+/i, "");
  const withSlash = withoutOrigin.startsWith("/")
    ? withoutOrigin
    : `/${withoutOrigin}`;
  const pathname = withSlash.split(/[?#]/, 1)[0] ?? withSlash;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Public tournament page the Expo app can open. Nested manage/edit stays off-device. */
export function inAppEventPath(href: string | null | undefined): string | null {
  if (!href) return null;
  const match = hrefPathname(href).match(/^\/event\/([^/]+)$/);
  if (!match) return null;
  return `/event/${match[1]}`;
}

/** Family desk, org workspace, account, and nested event manage/edit. */
export function isWebsiteOnlyHref(href: string | null | undefined): boolean {
  if (!href) return false;
  if (inAppEventPath(href)) return false;
  const pathname = hrefPathname(href);
  return (
    pathname === "/family" ||
    pathname.startsWith("/family/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/orgs" ||
    pathname.startsWith("/orgs/") ||
    pathname.startsWith("/event/")
  );
}

/** Safari URL for a website-only alert. Only Causey paths, never an arbitrary href. */
export function websiteHrefToOpen(
  href: string | null | undefined,
  origin: string
): string | null {
  if (!href || !isWebsiteOnlyHref(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.hostname === "causey.dev" || url.hostname === "www.causey.dev") {
        return url.toString();
      }
    } catch {
      return null;
    }
    return null;
  }
  if (!href.startsWith("/")) return null;
  return `${origin}${href}`;
}

export function formatAlertTime(createdAt: string, nowMs = Date.now()): string {
  const then = Date.parse(createdAt);
  if (Number.isNaN(then)) return createdAt;
  const minutes = Math.round((nowMs - then) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(then).toISOString().slice(0, 10);
}
