/** Matches the phone app's deadline in mobile/src/api.ts. */
const TIMEOUT_MS = 15000;

export class FetchTimeoutError extends Error {
  constructor() {
    super("The request took too long to answer.");
    this.name = "FetchTimeoutError";
  }
}

/**
 * `fetch` with a deadline, for anything a loading state waits on.
 *
 * A browser puts no time limit of its own on a stalled connection, so a
 * request that never answers leaves a skeleton on screen for as long as the
 * tab stays open. School Wi-Fi does this routinely.
 *
 * Pass the caller's own signal for aborts that are not failures — a changed
 * filter, an unmount. Those still reject, but the caller's signal reads as
 * aborted so it can stay quiet, while a timeout arrives as FetchTimeoutError
 * and is worth telling someone about.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs, signal, ...rest } = init;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abortFromCaller);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs ?? TIMEOUT_MS);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (error) {
    throw timedOut ? new FetchTimeoutError() : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
