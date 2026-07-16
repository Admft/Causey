import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">404</p>
      <h1 className="mt-1 font-display text-display font-bold tracking-tight text-foreground">
        That page isn&rsquo;t here.
      </h1>
      <p className="mt-3 max-w-prose text-md text-muted">
        The event may have been unpublished, or the link has a typo. Everything
        currently listed is one search away.
      </p>
      <Link href="/" className="cta-enabled mt-6">
        Search tournaments
      </Link>
    </div>
  );
}
