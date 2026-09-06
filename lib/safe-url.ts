/**
 * One guard for every URL Causey did not write itself.
 *
 * Listing links arrive from scrapers and from organizer-typed forms, and both
 * end up in an `href` on a public page. `new URL()` and zod's `.url()` both
 * accept `javascript:` and `data:`, so neither is a safety check on its own.
 * Anything that fails here has no safe rendering — callers drop the link.
 */

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
  ) {
    return false;
  }
  const [a, b] = parts.map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

/** Public http(s) only. Null means the link cannot be shown or followed. */
export function safeExternalUrl(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;

    const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
    if (
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home") ||
      isPrivateIpv4(hostname) ||
      (hostname.includes(":") && isPrivateIpv6(hostname))
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/** The hostname a person would recognize, for "continue on example.org" copy. */
export function externalUrlHost(raw: string | null | undefined): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;
  return new URL(safe).hostname.replace(/^www\./, "");
}
