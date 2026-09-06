"use client";

import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-display-sm font-bold text-foreground">
        The administration workspace could not load
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Causey could not retrieve this administrative view. Retry once; no
        moderation or account changes were made.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={reset} className="cta-enabled">
          Retry administration
        </button>
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
        >
          Back to the admin home
        </Link>
      </div>
    </div>
  );
}
