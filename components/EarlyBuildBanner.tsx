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
      <p className="mx-auto max-w-6xl px-5 py-2.5 text-xs leading-snug text-foreground sm:px-8 sm:text-sm">
        <span className="font-semibold text-brand-red">Early build.</span>{" "}
        <span className="sm:hidden">
          Chess search works; listings are incomplete.
        </span>
        <span className="hidden sm:inline">
          Chess search is usable; listings are incomplete and things still
          change.
        </span>
      </p>
    </div>
  );
}
