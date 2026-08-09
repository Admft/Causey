/**
 * Site-wide honesty strip. Causey is early; say that plainly without
 * empty "beta" / "coming soon" filler (design system §2).
 */
export function EarlyBuildBanner() {
  return (
    <div
      role="status"
      className="border-b border-brand-red/25 bg-accent-soft"
    >
      <p className="mx-auto max-w-6xl px-5 py-2 text-center text-xs leading-snug text-foreground sm:px-8 lg:py-3 lg:text-base">
        <span className="font-semibold text-brand-red">Early build.</span>{" "}
        <span className="lg:hidden">
          Chess search works. Fees, venues, and some events are missing.
        </span>
        <span className="hidden lg:inline">
          Chess search works for indexed US chess tournaments. Fees, venues,
          and coverage are incomplete. Other competition types aren&rsquo;t
          ready, and rosters, family, and district tools still change.
        </span>
      </p>
    </div>
  );
}
