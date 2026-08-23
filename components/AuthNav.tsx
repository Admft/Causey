"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AccountRole } from "@/lib/auth/types";
import {
  discoveryCategory,
  parseDiscoveryCategory,
  type DiscoveryCategory,
} from "@/lib/category-discovery";
import { organizationNavLabels } from "@/lib/portal-copy";

/**
 * Sign in / Account controls for the primary nav. A signed-in user gets at
 * most one tournament shortcut, from the category saved in Account settings;
 * signed-out visitors get none. Mobile uses short labels so the shortcut,
 * portal, Account, and Sign out stay one row; full wording returns at sm+.
 */
function navLinkClass(active: boolean) {
  return active
    ? "shrink-0 whitespace-nowrap text-sm font-semibold text-brand-red"
    : "shrink-0 whitespace-nowrap text-sm font-medium text-muted-strong transition-colors hover:text-foreground";
}

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const [email, setEmail] = useState<string | null | undefined>(
    configured ? undefined : null
  );
  const [role, setRole] = useState<AccountRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasOrgStaffAccess, setHasOrgStaffAccess] = useState(false);
  const [hasDistrictAccess, setHasDistrictAccess] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [shortcut, setShortcut] = useState<DiscoveryCategory | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createBrowserSupabaseClient();
    let active = true;
    let accessRequest = 0;

    async function loadAccess(userId: string | undefined) {
      const request = ++accessRequest;
      if (!active) return;
      if (!userId) {
        setRole(null);
        setIsAdmin(false);
        setHasOrgStaffAccess(false);
        setHasDistrictAccess(false);
        setUnreadAlerts(0);
        setShortcut(null);
        return;
      }
      const [
        profileResult,
        adminResult,
        membershipResult,
        ownedOrgResult,
        unreadResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role, preferred_competition_category")
          .eq("id", userId)
          .maybeSingle(),
        supabase.rpc("is_platform_admin"),
        supabase
          .from("org_memberships")
          .select("org_id, role")
          .eq("profile_id", userId)
          .eq("status", "active")
          .in("role", [
            "assistant_coach",
            "coach",
            "admin",
            "school_admin",
            "district_admin",
          ])
          .limit(1),
        supabase
          .from("organizations")
          .select("id, type")
          .eq("owner_profile_id", userId)
          .limit(1),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .is("read_at", null),
      ]);
      if (!active || request !== accessRequest) return;
      setRole((profileResult.data?.role as AccountRole) ?? null);
      // A missing preferred_competition_category column (migration 0056 not
      // applied) surfaces as a profile read error; the nav just renders no
      // shortcut rather than guessing one.
      setShortcut(
        profileResult.error
          ? null
          : parseDiscoveryCategory(
              profileResult.data?.preferred_competition_category
            )
      );
      setIsAdmin(adminResult.error ? false : adminResult.data === true);
      setHasOrgStaffAccess(
        Boolean(membershipResult.data?.length || ownedOrgResult.data?.length)
      );
      setHasDistrictAccess(
        Boolean(
          membershipResult.data?.some(
            (membership) => membership.role === "district_admin"
          ) ||
            ownedOrgResult.data?.some((organization) => organization.type === "district")
        )
      );
      setUnreadAlerts(unreadResult.error ? 0 : unreadResult.count ?? 0);
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        setEmail(data.user?.email ?? null);
        void loadAccess(data.user?.id);
      })
      .catch(() => {
        if (!active) return;
        setEmail(null);
        void loadAccess(undefined);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email ?? null);
      void loadAccess(session?.user?.id);
    });
    return () => {
      active = false;
      accessRequest += 1;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured || email === undefined) {
    return null;
  }

  if (!email) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/login"
          className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red"
        >
          Sign up
        </Link>
      </div>
    );
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const organizationLink = {
    href: "/orgs",
    ...organizationNavLabels({ hasDistrictAccess }),
  };
  const portalLinks =
    role === "parent"
      ? [
          { href: "/family", label: "Family", shortLabel: "Family" },
          ...(hasOrgStaffAccess ? [organizationLink] : []),
        ]
      : role === "coach"
        ? [organizationLink]
        : role === "student"
          ? [
              {
                href: "/me",
                label: "Plan",
                shortLabel: "Plan",
              },
              hasOrgStaffAccess
                ? organizationLink
                : { href: "/orgs", label: "My clubs", shortLabel: "Clubs" },
            ]
          : hasOrgStaffAccess
            ? [organizationLink]
            : [];

  const shortcutDefinition = shortcut ? discoveryCategory(shortcut) : null;
  const shortcutActive = shortcutDefinition
    ? pathname === shortcutDefinition.href ||
      pathname.startsWith(`${shortcutDefinition.href}/`) ||
      (shortcutDefinition.id === "chess" && pathname.startsWith("/pathways"))
    : false;

  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-5">
      {shortcutDefinition ? (
        <Link
          href={shortcutDefinition.href}
          aria-label={`${shortcutDefinition.label} tournaments`}
          aria-current={shortcutActive ? "page" : undefined}
          className={navLinkClass(shortcutActive)}
        >
          <span className="sm:hidden">{shortcutDefinition.shortLabel}</span>
          <span className="hidden sm:inline">
            {shortcutDefinition.label} tournaments
          </span>
        </Link>
      ) : null}
      {isAdmin ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={navLinkClass(pathname.startsWith("/admin"))}
        >
          Admin
        </Link>
      ) : null}
      {portalLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-label={link.label}
          aria-current={
            link.href === "/me"
              ? pathname === "/me"
                ? "page"
                : undefined
              : pathname.startsWith(link.href)
                ? "page"
                : undefined
          }
          className={navLinkClass(
            link.href === "/me"
              ? pathname === "/me"
              : pathname.startsWith(link.href)
          )}
        >
          <span className="sm:hidden">{link.shortLabel}</span>
          <span className="hidden sm:inline">{link.label}</span>
        </Link>
      ))}
      <Link
        href="/me/notifications"
        aria-label={
          unreadAlerts
            ? `Alerts, ${unreadAlerts} unread`
            : "Alerts"
        }
        aria-current={
          pathname.startsWith("/me/notifications") ? "page" : undefined
        }
        className={navLinkClass(pathname.startsWith("/me/notifications"))}
      >
        Alerts
        {unreadAlerts > 0 ? (
          <span className="text-muted"> ({unreadAlerts})</span>
        ) : null}
      </Link>
      <Link
        href="/account"
        aria-label="Account settings"
        aria-current={
          pathname.startsWith("/account") ? "page" : undefined
        }
        className={navLinkClass(pathname.startsWith("/account"))}
      >
        Account
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="shrink-0 whitespace-nowrap text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
