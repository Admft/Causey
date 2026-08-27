import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

/**
 * Shared HTML fetch for scrapers. Organizer sites often hang forever —
 * always bound the wait so one dead host cannot stall a full run.
 *
 * Also respects declared charset (CCA Word pages are windows-1252).
 * `res.text()` always decodes as UTF-8 and garbles Win-1252 bullets.
 */

const USER_AGENT =
  "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)";

/** Default 12s — enough for slow Drupal pages, short enough to skip dead hosts. */
export const FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_FETCH_TIMEOUT_MS ?? 12_000);
export const FETCH_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.SCRAPE_FETCH_MAX_ATTEMPTS ?? 4)
);

type FetchLike = typeof fetch;
type LookupResult = { address: string; family: number };
type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<LookupResult[]>;

export type FetchRetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: FetchLike;
  sleepImpl?: (ms: number) => Promise<void>;
  randomImpl?: () => number;
};

type PublicFetchOptions = FetchRetryOptions & {
  userAgent?: string;
  headers?: Record<string, string>;
  lookupImpl?: LookupFn;
  maxRedirects?: number;
};

const HTML_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.1";
const FETCH_MAX_BYTES = 10 * 1024 * 1024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ipv4Number(address: string): number | null {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return (
    (((parts[0]! << 24) >>> 0) +
      (parts[1]! << 16) +
      (parts[2]! << 8) +
      parts[3]!) >>>
    0
  );
}

function inIpv4Cidr(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

/** True only for globally routable addresses suitable for organizer fetches. */
export function isPublicInternetAddress(rawAddress: string): boolean {
  const address = rawAddress.toLowerCase().split("%")[0]!;
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPublicInternetAddress(mapped);
  const mappedHex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1]!, 16);
    const low = Number.parseInt(mappedHex[2]!, 16);
    return isPublicInternetAddress(
      `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
    );
  }

  if (isIP(address) === 4) {
    const value = ipv4Number(address);
    if (value === null) return false;
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ];
    return !blocked.some(([base, prefix]) =>
      inIpv4Cidr(value, ipv4Number(base)!, prefix)
    );
  }

  if (isIP(address) === 6) {
    return !(
      address === "::" ||
      address === "::1" ||
      /^f[cd]/.test(address) ||
      /^fe[89ab]/.test(address) ||
      /^fe[c-f]/.test(address) ||
      /^ff/.test(address) ||
      /^2001:db8(?::|$)/.test(address)
    );
  }

  return false;
}

/**
 * Validate an organizer URL before every request, including redirects.
 * DNS names are rejected if any answer is local/private to avoid mixed-answer
 * rebinding tricks.
 */
async function resolvePublicHttpUrl(
  rawUrl: string,
  lookupImpl: LookupFn = dnsLookup as LookupFn
): Promise<{ url: URL; address: LookupResult }> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Organizer URL must use http or https: ${rawUrl}`);
  }
  if (url.username || url.password) {
    throw new Error(`Organizer URL must not contain credentials: ${rawUrl}`);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error(`Organizer URL host is not public: ${rawUrl}`);
  }

  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookupImpl(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some((entry) => !isPublicInternetAddress(entry.address))
  ) {
    throw new Error(`Organizer URL resolved to a non-public address: ${rawUrl}`);
  }
  return { url, address: addresses[0]! };
}

export async function validatePublicHttpUrl(
  rawUrl: string,
  lookupImpl: LookupFn = dnsLookup as LookupFn
): Promise<URL> {
  return (await resolvePublicHttpUrl(rawUrl, lookupImpl)).url;
}

function retryDelayMs(
  attempt: number,
  response: Response | null,
  randomImpl: () => number
): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1000));
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
      return Math.min(30_000, Math.max(0, dateMs - Date.now()));
    }
  }
  const base = Math.min(8_000, 400 * 2 ** (attempt - 1));
  return Math.round(base * (0.75 + randomImpl() * 0.5));
}

function retryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Fetch with bounded retry/backoff for rate limits, server errors, and network failures. */
export async function fetchResponseWithRetry(
  url: string | URL,
  init: RequestInit = {},
  opts: FetchRetryOptions = {}
): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleepImpl = opts.sleepImpl ?? sleep;
  const randomImpl = opts.randomImpl ?? Math.random;
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? FETCH_MAX_ATTEMPTS);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response | null = null;
    try {
      response = await fetchImpl(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!retryableStatus(response.status) || attempt === maxAttempts) {
        return response;
      }
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }
    await sleepImpl(retryDelayMs(attempt, response, randomImpl));
  }
  throw lastError instanceof Error ? lastError : new Error(`Fetch failed: ${url}`);
}

function normalizeCharset(raw: string | undefined | null): string {
  if (!raw) return "utf-8";
  const c = raw.trim().toLowerCase().replace(/["']/g, "");
  if (c === "utf8") return "utf-8";
  if (
    c === "windows-1252" ||
    c === "cp1252" ||
    c === "iso-8859-1" ||
    c === "latin1" ||
    c === "latin-1"
  ) {
    return "windows-1252";
  }
  return c;
}

/**
 * Node's TextDecoder has treated windows-1252 like latin1 for 0x80–0x9F on
 * some runtimes (bullet 0x95 becomes U+0095). Map the real Win-1252 glyphs.
 * https://github.com/nodejs/node/issues/56542
 */
const WINDOWS_1252_EXTRAS: Record<number, string> = {
  0x80: "\u20ac",
  0x82: "\u201a",
  0x83: "\u0192",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02c6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017d",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02dc",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203a",
  0x9c: "\u0153",
  0x9e: "\u017e",
  0x9f: "\u0178",
};

function decodeWindows1252(buf: Buffer | Uint8Array): string {
  const bytes = Buffer.from(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    out += WINDOWS_1252_EXTRAS[byte] ?? String.fromCharCode(byte);
  }
  return out;
}

/** Decode HTML bytes using Content-Type / <meta charset> (Word pages ≠ UTF-8). */
export function decodeHtmlBuffer(
  buf: Buffer | Uint8Array,
  contentType: string | null = null
): string {
  const headerCharset = contentType?.match(/charset\s*=\s*([^\s;]+)/i)?.[1];
  const headLatin = Buffer.from(buf).subarray(0, 4096).toString("latin1");
  const metaCharset =
    headLatin.match(/charset\s*=\s*["']?\s*([^\s"'/>;]+)/i)?.[1] ??
    headLatin.match(/charset=["']([^"']+)["']/i)?.[1];
  const charset = normalizeCharset(headerCharset || metaCharset || "utf-8");
  if (charset === "windows-1252") {
    return decodeWindows1252(buf);
  }
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export async function fetchHtml(
  url: string,
  opts: {
    timeoutMs?: number;
    userAgent?: string;
    method?: "GET" | "POST";
    body?: string | URLSearchParams;
    headers?: Record<string, string>;
    maxAttempts?: number;
    fetchImpl?: FetchLike;
  } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  let res: Response;
  try {
    res = await fetchResponseWithRetry(url, {
      headers: {
        "User-Agent": opts.userAgent ?? USER_AGENT,
        // Organizer discovery also reads sitemap.xml. Some hosts reject an
        // HTML-only Accept header for XML even though the same fetcher handles
        // both safely as decoded text.
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...opts.headers,
      },
      method: opts.method ?? "GET",
      body: opts.body,
    }, {
      timeoutMs,
      maxAttempts: opts.maxAttempts,
      fetchImpl: opts.fetchImpl,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(`Fetch timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} from ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeHtmlBuffer(buf, res.headers.get("content-type"));
}

/**
 * SSRF-safe fetch for untrusted organizer URLs. Redirects are followed
 * manually so every destination is re-resolved and revalidated.
 */
export async function fetchPublicResponse(
  rawUrl: string,
  opts: PublicFetchOptions = {}
): Promise<Response> {
  let target = await resolvePublicHttpUrl(rawUrl, opts.lookupImpl);
  const maxRedirects = opts.maxRedirects ?? 5;

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const pinnedFetch: FetchLike =
      opts.fetchImpl ??
      (async (_input, init) =>
        requestPinnedTarget(
          target.url,
          target.address,
          init,
          opts.timeoutMs ?? FETCH_TIMEOUT_MS
        ));
    const response = await fetchResponseWithRetry(
      target.url,
      {
        redirect: "manual",
        headers: {
          "User-Agent": opts.userAgent ?? USER_AGENT,
          Accept: HTML_ACCEPT,
          ...opts.headers,
        },
      },
      { ...opts, fetchImpl: pinnedFetch }
    );
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        throw new Error(`Redirect missing Location from ${target.url}`);
      }
      if (redirect === maxRedirects) {
        throw new Error(`Too many organizer redirects from ${rawUrl}`);
      }
      target = await resolvePublicHttpUrl(
        new URL(location, target.url).toString(),
        opts.lookupImpl
      );
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Fetch failed: HTTP ${response.status} from ${target.url}`
      );
    }
    return response;
  }
  throw new Error(`Too many organizer redirects from ${rawUrl}`);
}

/** SSRF-safe HTML fetch for untrusted organizer pages. */
export async function fetchPublicHtml(
  rawUrl: string,
  opts: PublicFetchOptions = {}
): Promise<string> {
  const response = await fetchPublicResponse(rawUrl, opts);
  const buf = Buffer.from(await response.arrayBuffer());
  return decodeHtmlBuffer(buf, response.headers.get("content-type"));
}

/** SSRF-safe image bytes for untrusted organizer covers. */
export async function fetchPublicBytes(
  rawUrl: string,
  opts: PublicFetchOptions = {}
): Promise<{ buf: Buffer; contentType: string | null }> {
  const response = await fetchPublicResponse(rawUrl, {
    ...opts,
    headers: {
      Accept: IMAGE_ACCEPT,
      ...opts.headers,
    },
  });
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length > FETCH_MAX_BYTES) {
    throw new Error(`Organizer response exceeded 10 MiB: ${rawUrl}`);
  }
  return { buf, contentType: response.headers.get("content-type") };
}

/**
 * Connect to the already-validated address while preserving Host and TLS SNI.
 * This closes the DNS validation/fetch race that ordinary fetch would leave.
 */
function requestPinnedTarget(
  url: URL,
  target: LookupResult,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = new Headers(init?.headers);
    headers.set("Host", url.host);
    headers.set("Accept-Encoding", "identity");
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        protocol: url.protocol,
        hostname: target.address,
        family: target.family,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: init?.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
        ...(url.protocol === "https:" ? { servername: url.hostname } : {}),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) {
            request.destroy(new Error(`Organizer response exceeded 10 MiB: ${url}`));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.on("end", () => {
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) {
              for (const item of value) responseHeaders.append(name, item);
            } else if (value !== undefined) {
              responseHeaders.set(name, String(value));
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode ?? 500,
              statusText: response.statusMessage,
              headers: responseHeaders,
            })
          );
        });
      }
    );
    request.setTimeout(timeoutMs, () => {
      const error = new Error(`Fetch timed out after ${timeoutMs}ms: ${url}`);
      error.name = "TimeoutError";
      request.destroy(error);
    });
    request.on("error", reject);
    if (init?.body) {
      if (typeof init.body === "string" || init.body instanceof Uint8Array) {
        request.write(init.body);
      } else if (init.body instanceof URLSearchParams) {
        request.write(init.body.toString());
      } else {
        request.destroy(new Error("Unsupported organizer request body"));
        return;
      }
    }
    request.end();
  });
}
