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
  } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  let res: Response;
  try {
    res = await fetch(url, {
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
      signal: AbortSignal.timeout(timeoutMs),
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
