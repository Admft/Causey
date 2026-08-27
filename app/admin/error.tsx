"use client";

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
      <button type="button" onClick={reset} className="cta-enabled mt-5">
        Retry administration
      </button>
    </div>
  );
}
