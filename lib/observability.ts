/**
 * Optional production error reporting. Empty SENTRY_DSN is a no-op so the
 * app still boots with no secrets.
 */

type SentryDsn = {
  publicKey: string;
  host: string;
  projectId: string;
};

function parseSentryDsn(dsn: string): SentryDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "").split("/")[0];
    if (!url.username || !projectId) return null;
    return {
      publicKey: url.username,
      host: url.host,
      projectId,
    };
  } catch {
    return null;
  }
}

export function reportError(error: unknown, context: string): void {
  const message =
    error instanceof Error ? error.message : "Unknown error.";
  console.error(context, error);

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const payload = {
    event_id: crypto.randomUUID().replaceAll("-", ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    environment: process.env.NODE_ENV ?? "development",
    message,
    extra: { context },
    exception:
      error instanceof Error
        ? {
            values: [
              {
                type: error.name,
                value: error.message,
                stacktrace: error.stack
                  ? {
                      frames: error.stack
                        .split("\n")
                        .slice(1, 20)
                        .map((line) => ({ filename: line.trim() })),
                    }
                  : undefined,
              },
            ],
          }
        : undefined,
  };

  const envelope = `${JSON.stringify({ event_id: payload.event_id, sent_at: payload.timestamp })}\n${JSON.stringify({ type: "event", content_type: "application/json" })}\n${JSON.stringify(payload)}`;
  const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_key=${parsed.publicKey}`;
  void fetch(storeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
    body: envelope,
  }).catch(() => {
    // Reporting must never break the user response.
  });
}
