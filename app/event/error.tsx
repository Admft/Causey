"use client";

export default function EventError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-display-sm font-bold text-foreground">
        This event could not load
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        The event details are temporarily unavailable. Retry once; your account
        and any saved plans have not been changed.
      </p>
      <button type="button" onClick={reset} className="cta-enabled mt-5">
        Retry event
      </button>
    </main>
  );
}
