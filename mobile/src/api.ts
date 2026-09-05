import { apiUrl } from "./theme";

/** A dead network on a review device must fail loudly, not spin forever. */
const TIMEOUT_MS = 15000;

const OFFLINE_MESSAGE =
  "Causey could not reach the server. Check your connection and try again.";
const TIMEOUT_MESSAGE =
  "The server took too long to answer. Check your connection and try again.";

export class CauseyApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CauseyApiError";
    this.status = status;
  }
}

export async function causeyFetch(
  path: string,
  options: {
    token?: string | null;
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {}
) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted && options.signal?.aborted) throw err;
    throw new CauseyApiError(aborted ? TIMEOUT_MESSAGE : OFFLINE_MESSAGE, 0);
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    [key: string]: unknown;
  };
  if (!res.ok) {
    const message =
      typeof json.error === "string" && json.error
        ? json.error
        : res.status === 404
          ? "This screen is not on the server this app is talking to."
          : "Something went wrong. Try again.";
    throw new CauseyApiError(message, res.status);
  }
  return json;
}

export function formatFeeCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Fee not listed";
  if (cents === 0) return "No entry fee";
  return (cents / 100) % 1 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}

export function formatDateRange(start: string, end: string | null): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Month + day pair for the search-card date chip. */
export function dateChipParts(start: string): { month: string; day: string } {
  const [y, m, d] = start.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return { month, day: String(d) };
}
