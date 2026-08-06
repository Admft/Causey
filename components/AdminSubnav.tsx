"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Moderation", href: "/admin/moderation" },
  { label: "Overview", href: "/admin" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Tournaments", href: "/admin/tournaments" },
] as const;

function tabClass(active: boolean) {
  return active
    ? "inline-flex items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
    : "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground";
}

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-2.5 sm:px-8">
        <p className="text-xs font-semibold text-muted">Causey administration</p>
        <nav aria-label="Administration sections" className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active =
              tab.href === "/admin"
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
