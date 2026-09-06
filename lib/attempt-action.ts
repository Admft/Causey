const UNREACHABLE =
  "Could not reach Causey. Check your connection, then try again.";

/**
 * Call a server action and treat a thrown error like any other failure.
 *
 * Server actions return `{ ok: false, error }` for everything they can
 * anticipate, so forms only handle that shape. A dropped connection is not one
 * of those: the call rejects, the `finally` re-enables the button, and nothing
 * ever says the save did not happen — the worst version of a failure, because
 * it looks exactly like success.
 *
 * Wrapping the call keeps one code path: every failure arrives as a result the
 * form already knows how to show.
 */
export async function attemptAction<T extends { ok: boolean }>(
  run: () => Promise<T>
): Promise<T | { ok: false; error: string }> {
  try {
    return await run();
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
}
