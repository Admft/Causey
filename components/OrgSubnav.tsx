import Link from "next/link";

/**
 * Org context bar — mirrors ChessSubnav's tab styling for portal surfaces.
 * Roster is coach-only, so the tab hides for plain members.
 */

const TABS = [
  { id: "overview", label: "Tournaments", path: "" },
  { id: "roster", label: "Roster & groups", path: "/roster" },
] as const;

export type OrgTab = (typeof TABS)[number]["id"];

function tabClass(active: boolean) {
  return active
    ? "inline-flex items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
    : "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground";
}

export function OrgSubnavBar({
  slug,
  orgName,
  tab,
  showRoster,
}: {
  slug: string;
  orgName: string;
  tab: OrgTab;
  showRoster: boolean;
}) {
  const tabs = TABS.filter((t) => t.id !== "roster" || showRoster);
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-2.5 sm:px-8">
        <p className="text-xs font-semibold text-muted">
          <Link href="/orgs" className="hover:text-foreground">
            Organizations
          </Link>{" "}
          / <span className="text-muted-strong">{orgName}</span>
        </p>
        <nav aria-label="Organization sections" className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = t.id === tab;
            if (active) {
              return (
                <span key={t.id} aria-current="page" className={tabClass(true)}>
                  {t.label}
                </span>
              );
            }
            return (
              <Link
                key={t.id}
                href={`/orgs/${slug}${t.path}`}
                className={tabClass(false)}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
