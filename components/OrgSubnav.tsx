import Link from "next/link";
import type { OrganizationType } from "@/lib/auth/orgs";

/**
 * Org context bar — mirrors ChessSubnav's tab styling for portal surfaces.
 * Roster is coach-only, so the tab hides for plain members.
 */

const TABS = [
  { id: "overview", label: "Overview", path: "", access: "member" },
  {
    id: "competitions",
    label: "Competitions",
    path: "/competitions",
    access: "member",
  },
  { id: "roster", label: "Roster & groups", path: "/roster", access: "staff" },
  { id: "people", label: "Invites & staff", path: "/people", access: "admin" },
  { id: "reports", label: "Reports", path: "/reports", access: "admin" },
  { id: "settings", label: "Settings", path: "/settings", access: "admin" },
] as const;

const DISTRICT_TABS = [
  { id: "overview", label: "Overview", path: "", access: "member" },
  {
    id: "competitions",
    label: "Competitions",
    path: "/competitions",
    access: "member",
  },
  { id: "schools", label: "Schools", path: "/settings#schools", access: "admin" },
  { id: "people", label: "District staff", path: "/people", access: "admin" },
  { id: "reports", label: "Reports", path: "/reports", access: "admin" },
  { id: "settings", label: "Settings", path: "/settings", access: "admin" },
] as const;

export type OrgTab =
  | (typeof TABS)[number]["id"]
  | (typeof DISTRICT_TABS)[number]["id"];

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
  showAdmin = false,
  orgType,
}: {
  slug: string;
  orgName: string;
  /** Pass null on tournament manage/edit so Overview isn’t falsely active. */
  tab: OrgTab | null;
  showRoster: boolean;
  showAdmin?: boolean;
  orgType?: OrganizationType;
}) {
  const sourceTabs = orgType === "district" ? DISTRICT_TABS : TABS;
  const tabs = sourceTabs.filter((item) => {
    if (item.access === "member") return true;
    if (item.access === "staff") return showRoster;
    return showAdmin;
  });
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-2 px-5 py-2.5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <p className="truncate text-xs font-semibold text-muted">
          <Link href="/orgs" className="hover:text-foreground">
            {orgType === "district" ? "Districts and schools" : "Organizations"}
          </Link>{" "}
          / <span className="text-muted-strong">{orgName}</span>
        </p>
        <nav
          aria-label="Organization sections"
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5"
        >
          {tabs.map((t) => {
            const active = tab !== null && t.id === tab;
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
