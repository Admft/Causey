import Link from "next/link";

/**
 * Chess context bar — sits under the sticky header on chess surfaces.
 * Left: competition-type switcher (only Chess is live).
 * Right: in-chess tools (Tournaments search + Pathways).
 */

const CATEGORIES = [
  { id: "chess", label: "Chess", href: "/chess", available: true },
  { id: "stem", label: "STEM", href: null, available: false },
  { id: "debate", label: "Debate", href: null, available: false },
  { id: "arts", label: "Arts", href: null, available: false },
  { id: "writing", label: "Writing", href: null, available: false },
] as const;

const CHESS_TOOLS = [
  { id: "tournaments", label: "Tournaments", href: "/chess" },
  { id: "pathways", label: "Pathways", href: "/pathways" },
] as const;

export type ChessTool = (typeof CHESS_TOOLS)[number]["id"];

function toolClass(active: boolean) {
  return active
    ? "inline-flex items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
    : "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground";
}

export function ChessSubnav({ tool = "tournaments" }: { tool?: ChessTool }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-xs font-semibold text-muted">Competing in</p>
        <div
          role="navigation"
          aria-label="Competition type"
          className="flex flex-wrap items-center gap-1"
        >
          {CATEGORIES.map((cat) => {
            if (!cat.available) {
              return (
                <span
                  key={cat.id}
                  title="Not ready yet"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium text-muted"
                >
                  {cat.label}
                  <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                    Soon
                  </span>
                </span>
              );
            }

            // Chess is the only live type — show as current category context.
            return (
              <span
                key={cat.id}
                aria-current="page"
                className="inline-flex items-center rounded-md border border-line bg-white px-2.5 py-1 text-sm font-semibold text-foreground"
              >
                {cat.label}
              </span>
            );
          })}
        </div>
      </div>

      <nav
        aria-label="Chess tools"
        className="flex flex-wrap items-center gap-1 border-t border-line pt-2 sm:border-t-0 sm:pt-0"
      >
        {CHESS_TOOLS.map((item) => {
          const active = item.id === tool;
          if (active) {
            return (
              <span
                key={item.id}
                aria-current="page"
                className={toolClass(true)}
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link key={item.id} href={item.href} className={toolClass(false)}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Shared chrome wrapper for chess surfaces. */
export function ChessSubnavBar({ tool }: { tool: ChessTool }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-2.5 sm:px-8">
        <ChessSubnav tool={tool} />
      </div>
    </div>
  );
}
