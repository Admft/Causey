/**
 * Shared HTML fetch for scrapers. Organizer sites often hang forever —
 * always bound the wait so one dead host cannot stall a full run.
 */

const USER_AGENT =
  "CauseyBot/0.1 (+https://causey.dev; tournament discovery indexing)";

/** Default 12s — enough for slow Drupal pages, short enough to skip dead hosts. */
export const FETCH_TIMEOUT_MS = Number(process.env.SCRAPE_FETCH_TIMEOUT_MS ?? 12_000);

export async function fetchHtml(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const res = await fetch(url, {
    headers: {
      "User-Agent": opts.userAgent ?? USER_AGENT,
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} from ${url}`);
  return res.text();
}
