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
  { id: "activity", label: "Activity", path: "/activity", access: "admin" },
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
  { id: "schools", label: "Schools", path: "/schools", access: "admin" },
  {
    id: "people",
    label: "District & school staff",
    path: "/people",
    access: "admin",
  },
  { id: "reports", label: "Reports", path: "/reports", access: "admin" },
  { id: "activity", label: "Activity", path: "/activity", access: "admin" },
  { id: "settings", label: "Settings", path: "/settings", access: "admin" },
] as const;

export type OrgTab =
  | (typeof TABS)[number]["id"]
  | (typeof DISTRICT_TABS)[number]["id"];

/**
 * Persistent account-type marker for the workspace chrome. Schools and
 * districts must read as accounts with a district structure behind them,
 * not as generic clubs — the label rides next to the org name on every tab.
 */
const ORG_ACCOUNT_LABEL: Record<OrganizationType, string> = {
  school: "School account",
  district: "District account",
  club: "Club",
  team: "Team",
};

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
  roleLabel,
}: {
  slug: string;
  orgName: string;
  /** Pass null on tournament manage/edit so Overview isn’t falsely active. */
  tab: OrgTab | null;
  showRoster: boolean;
  showAdmin?: boolean;
  orgType?: OrganizationType;
  roleLabel?: string;
}) {
  const sourceTabs = orgType === "district" ? DISTRICT_TABS : TABS;
  const resolvedRoleLabel =
    roleLabel ??
    (orgType === "district" && showAdmin
      ? "District administrator"
      : orgType === "school" && showAdmin
        ? showRoster
          ? "School administrator"
          : "District administrator"
        : orgType === "school" && showRoster
          ? "School staff"
          : null);
  const tabs = sourceTabs.filter((item) => {
    if (item.access === "member") return true;
    if (item.access === "staff") return showRoster;
    if (orgType === "school" && item.id === "reports" && !showRoster) {
      return false;
    }
    return showAdmin;
  });
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-2 px-5 py-2.5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-xs font-semibold text-muted">
            <Link href="/orgs" className="hover:text-foreground">
              {orgType === "district"
                ? "Districts and schools"
                : "Organizations"}
            </Link>{" "}
            / <span className="text-muted-strong">{orgName}</span>
          </p>
          {orgType ? (
            <span className="shrink-0 rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
              {ORG_ACCOUNT_LABEL[orgType]}
            </span>
          ) : null}
          {resolvedRoleLabel ? (
            <span className="shrink-0 text-xs font-semibold text-foreground">
              · {resolvedRoleLabel}
            </span>
          ) : null}
        </div>
        <nav
          aria-label="Organization sections"
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5"
        >
          {tabs.map((t) => {
            const active = tab !== null && t.id === tab;
            const label =
              orgType === "school" && t.id === "roster"
                ? "Students & groups"
                : orgType === "school" && t.id === "people"
                  ? "Coaches & staff"
                  : t.label;
            if (active) {
              return (
                <span key={t.id} aria-current="page" className={tabClass(true)}>
                  {label}
                </span>
              );
            }
            return (
              <Link
                key={t.id}
                href={`/orgs/${slug}${t.path}`}
                className={tabClass(false)}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
