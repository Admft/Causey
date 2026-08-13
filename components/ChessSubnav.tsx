import Link from "next/link";
import { DISCOVERY_CATEGORIES, type DiscoveryCategory } from "@/lib/category-discovery";

/**
 * Discovery context bar. Category links are shared by every public search
 * surface; chess-only tools appear only in chess context.
 */

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

export function ChessSubnav({
  category = "chess",
  tool = "tournaments",
}: {
  category?: DiscoveryCategory;
  tool?: ChessTool;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-xs font-semibold text-muted">Competing in</p>
        <div
          role="navigation"
          aria-label="Competition type"
          className="flex flex-wrap items-center gap-1"
        >
          {DISCOVERY_CATEGORIES.map((cat) => {
            const active = cat.id === category;
            if (active) {
              return (
                <span
                  key={cat.id}
                  aria-current="page"
                  className="inline-flex items-center rounded-md border border-line bg-white px-2.5 py-1 text-sm font-semibold text-foreground"
                >
                  {cat.label}
                </span>
              );
            }

            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground"
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {category === "chess" ? (
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
      ) : null}
    </div>
  );
}

/** Shared chrome wrapper for public discovery surfaces. */
export function ChessSubnavBar({
  category = "chess",
  tool = "tournaments",
}: {
  category?: DiscoveryCategory;
  tool?: ChessTool;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-2.5 sm:px-8">
        <ChessSubnav category={category} tool={tool} />
      </div>
    </div>
  );
}
