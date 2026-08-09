"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <h1 className="font-display text-display font-bold tracking-tight text-foreground">
        Something broke on our side.
      </h1>
      <p className="mt-3 max-w-prose text-md text-muted">
        The page hit an error while loading{error.digest ? ` (reference ${error.digest})` : ""}.
        Retry once. If it keeps happening, share the reference above with the
        person who manages your Causey access.
      </p>
      <button type="button" onClick={reset} className="cta-enabled mt-6">
        Retry this page
      </button>
    </div>
  );
}
