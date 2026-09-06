"use client";

import Link from "next/link";

/**
 * /family had a loading skeleton but no boundary, so a failed read fell
 * through to the generic page error and a parent lost the thread of what
 * they were doing.
 */
export default function FamilyError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-display-sm font-bold text-foreground">
        Your family desk could not load
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Causey could not read your students right now. Retry once; no RSVP,
        registration, or family link was changed.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={reset} className="cta-enabled">
          Retry family
        </button>
        <Link
          href="/account"
          className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
        >
          Go to account settings
        </Link>
      </div>
    </div>
  );
}
