import Link from "next/link";

/**
 * Compact category chrome for discovery surfaces. Sits under the sticky
 * header as navigation — not inside the hero, where it fights the headline.
 * Chess is live; everything else is visible but unavailable.
 */

const CATEGORIES = [
  { id: "chess", label: "Chess", href: "/chess", available: true },
  { id: "stem", label: "STEM", href: null, available: false },
  { id: "debate", label: "Debate", href: null, available: false },
  { id: "arts", label: "Arts", href: null, available: false },
  { id: "writing", label: "Writing", href: null, available: false },
] as const;

export function CategorySwitcher({
  active = "chess",
}: {
  active?: (typeof CATEGORIES)[number]["id"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="text-xs font-semibold text-muted">Competing in</p>
      <div
        role="navigation"
        aria-label="Competition type"
        className="flex flex-wrap items-center gap-1"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === active;

          if (!cat.available) {
            return (
              <span
                key={cat.id}
                title="Coming soon"
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium text-muted"
              >
                {cat.label}
                <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                  Soon
                </span>
              </span>
            );
          }

          if (isActive) {
            return (
              <span
                key={cat.id}
                aria-current="page"
                className="inline-flex items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
              >
                {cat.label}
              </span>
            );
          }

          return (
            <Link
              key={cat.id}
              href={cat.href!}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground"
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
