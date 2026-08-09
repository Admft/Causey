"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Moderation", href: "/admin/moderation" },
  { label: "Tournaments", href: "/admin/tournaments" },
  { label: "Scrapers", href: "/admin/scrapers" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Users", href: "/admin/users" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-line bg-surface lg:border-r lg:border-b-0 lg:bg-transparent">
      <nav
        aria-label="Administration sections"
        className="flex items-center gap-1 overflow-x-auto px-5 py-2.5 sm:px-8 lg:hidden"
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "inline-flex shrink-0 items-center rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-sm font-semibold text-brand-red"
                  : "inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-sm font-medium text-muted-strong transition-colors hover:bg-white hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:sticky lg:top-6 lg:block lg:py-10 lg:pl-8 lg:pr-6">
        <p className="px-3 text-2xs font-semibold uppercase tracking-wide text-muted">
          Administration
        </p>
        <nav aria-label="Administration sections" className="mt-3 grid gap-0.5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-accent-soft px-3 py-2 text-sm font-semibold text-brand-red"
                    : "rounded-md px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-soft hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
