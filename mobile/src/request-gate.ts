/**
 * Latest GET wins. Abort an in-flight list when a tap writes so the older
 * payload cannot paint over Going / Can't go / Clear.
 */
export function createRequestGate() {
  let current: AbortController | null = null;

  return {
    abort() {
      current?.abort();
      current = null;
    },
    start() {
      current?.abort();
      const next = new AbortController();
      current = next;
      return next;
    },
    isCurrent(controller: AbortController) {
      return current === controller;
    },
  };
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
