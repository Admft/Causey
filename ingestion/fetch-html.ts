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
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export async function fetchHtml(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": opts.userAgent ?? USER_AGENT,
        Accept: "text/html",
      },
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
