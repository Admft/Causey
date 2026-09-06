"use client";

import Link from "next/link";

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
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={reset} className="cta-enabled">
          Retry event
        </button>
        <Link
          href="/chess"
          className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
        >
          Search tournaments instead
        </Link>
      </div>
    </main>
  );
}
