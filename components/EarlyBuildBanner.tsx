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
          Chess search is usable. Other public directories use only a few
          official sources, so expect incomplete data.
        </span>
        <span className="hidden lg:inline">
          Public search is usable for indexed chess tournaments. Speech and
          debate, STEM, arts, and writing directories currently use only a few
          official sources; fees, venues, dates, and coverage may be incomplete.
        </span>
      </p>
    </div>
  );
}
