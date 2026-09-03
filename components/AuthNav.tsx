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
 * Sign in / Account controls for the primary nav. Signed-in users always get
 * Find (preferred directory, or homepage search). Phone keeps Find, one portal,
 * and a More chip; md+ shows the full row. Session resolving reserves the
 * signed-out pair without flashing empty chrome.
 */
function navLinkClass(active: boolean) {
  return active
    ? "shrink-0 whitespace-nowrap text-sm font-semibold text-brand-red"
    : "shrink-0 whitespace-nowrap text-sm font-medium text-muted-strong transition-colors hover:text-foreground";
}

function menuItemClass(active: boolean) {
  return active
    ? "block rounded-md bg-accent-soft px-3 py-2 text-sm font-semibold text-brand-red"
    : "block rounded-md px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:bg-surface-soft hover:text-foreground";
}

const SIGN_IN_LINK_CLASS =
  "shrink-0 whitespace-nowrap text-sm font-medium text-muted-strong transition-colors hover:text-foreground";
const SIGN_UP_CHIP_CLASS =
  "shrink-0 whitespace-nowrap rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red";
const MORE_CHIP_CLASS = `${SIGN_UP_CHIP_CLASS} cursor-pointer list-none [&::-webkit-details-marker]:hidden [&::marker]:content-none`;

function SignedOutPair() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link href="/login" className={SIGN_IN_LINK_CLASS}>
        Sign in
      </Link>
      <Link href="/signup" className={SIGN_UP_CHIP_CLASS}>
        Sign up
      </Link>
    </div>
  );
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
  const [hasSchoolAccess, setHasSchoolAccess] = useState(false);
  const [hasClubAccess, setHasClubAccess] = useState(false);
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
        setHasSchoolAccess(false);
        setHasClubAccess(false);
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
          .select("org_id, role, organizations(type)")
          .eq("profile_id", userId)
          .eq("status", "active"),
        supabase
          .from("organizations")
          .select("id, type")
          .eq("owner_profile_id", userId),
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
        Boolean(
          (membershipResult.data ?? []).some((membership: { role?: string }) =>
            [
              "assistant_coach",
              "coach",
              "admin",
              "school_admin",
              "district_admin",
            ].includes(membership.role ?? "")
          ) || ownedOrgResult.data?.length
        )
      );
      const membershipTypes = (membershipResult.data ?? []).flatMap(
        (membership: {
          role?: string;
          organizations?: { type?: string } | { type?: string }[] | null;
        }) => {
          const embedded = membership.organizations;
          const type = Array.isArray(embedded)
            ? embedded[0]?.type
            : embedded?.type;
          return type ? [type] : [];
        }
      );
      const ownedTypes = (ownedOrgResult.data ?? []).map(
        (organization: { type?: string }) => organization.type
      );
      const staffTypes = [...membershipTypes, ...ownedTypes];
      const districtAccess = Boolean(
        (membershipResult.data ?? []).some(
          (membership: { role?: string }) =>
            membership.role === "district_admin"
        ) || staffTypes.includes("district")
      );
      const schoolAccess = staffTypes.includes("school");
      const clubAccess = staffTypes.includes("club") || staffTypes.includes("team");
      setHasDistrictAccess(districtAccess);
      setHasSchoolAccess(schoolAccess);
      setHasClubAccess(
        clubAccess ||
          ((profileResult.data?.role as AccountRole | undefined) === "coach" &&
            !districtAccess &&
            !schoolAccess)
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

  if (email === undefined) {
    return (
      <div
        className="pointer-events-none invisible flex shrink-0 items-center gap-3"
        aria-busy="true"
        aria-label="Checking sign-in"
      >
        <span className={SIGN_IN_LINK_CLASS}>Sign in</span>
        <span className={SIGN_UP_CHIP_CLASS}>Sign up</span>
      </div>
    );
  }

  if (!email) {
    return <SignedOutPair />;
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const organizationLink = {
    href: "/orgs",
    ...organizationNavLabels({
      hasDistrictAccess,
      hasSchoolAccess,
      hasClubAccess,
    }),
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
              organizationLink,
            ]
          : hasOrgStaffAccess
            ? [organizationLink]
            : [];

  const shortcutDefinition = shortcut ? discoveryCategory(shortcut) : null;
  const findHref = shortcutDefinition?.href ?? "/#search";
  const findActive = shortcutDefinition
    ? pathname === shortcutDefinition.href ||
      pathname.startsWith(`${shortcutDefinition.href}/`) ||
      (shortcutDefinition.id === "chess" && pathname.startsWith("/pathways"))
    : pathname === "/";

  const primaryPortal = portalLinks[0];
  const extraPortals = portalLinks.slice(1);
  const alertsLabel = unreadAlerts
    ? `Alerts, ${unreadAlerts} unread`
    : "Alerts";
  const alertsActive = pathname.startsWith("/me/notifications");
  const accountActive = pathname.startsWith("/account");
  const adminActive = pathname.startsWith("/admin");

  function findLink() {
    return (
      <Link
        href={findHref}
        aria-label="Find tournaments"
        aria-current={findActive ? "page" : undefined}
        className={navLinkClass(findActive)}
      >
        <span className="md:hidden">Find</span>
        <span className="hidden md:inline">Find tournaments</span>
      </Link>
    );
  }

  function portalNavLink(
    link: (typeof portalLinks)[number],
    variant: "row" | "compact" | "menu"
  ) {
    const active =
      link.href === "/me"
        ? pathname === "/me"
        : pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-label={link.label}
        aria-current={active ? "page" : undefined}
        className={variant === "menu" ? menuItemClass(active) : navLinkClass(active)}
      >
        {variant === "compact" ? (
          link.shortLabel
        ) : variant === "menu" ? (
          link.label
        ) : (
          <>
            <span className="md:hidden">{link.shortLabel}</span>
            <span className="hidden md:inline">{link.label}</span>
          </>
        )}
      </Link>
    );
  }

  const alertsRow = (
    <Link
      href="/me/notifications"
      aria-label={alertsLabel}
      aria-current={alertsActive ? "page" : undefined}
      className={navLinkClass(alertsActive)}
    >
      Alerts
      {unreadAlerts > 0 ? (
        <span className="text-muted"> ({unreadAlerts})</span>
      ) : null}
    </Link>
  );
  const alertsMenu = (
    <Link
      href="/me/notifications"
      aria-label={alertsLabel}
      aria-current={alertsActive ? "page" : undefined}
      className={menuItemClass(alertsActive)}
    >
      Alerts
      {unreadAlerts > 0 ? (
        <span className="text-muted"> ({unreadAlerts})</span>
      ) : null}
    </Link>
  );
  const accountRow = (
    <Link
      href="/account"
      aria-label="Account settings"
      aria-current={accountActive ? "page" : undefined}
      className={navLinkClass(accountActive)}
    >
      Account
    </Link>
  );
  const accountMenu = (
    <Link
      href="/account"
      aria-label="Account settings"
      aria-current={accountActive ? "page" : undefined}
      className={menuItemClass(accountActive)}
    >
      Account
    </Link>
  );
  const adminRow = isAdmin ? (
    <Link
      href="/admin"
      aria-current={adminActive ? "page" : undefined}
      className={navLinkClass(adminActive)}
    >
      Admin
    </Link>
  ) : null;
  const adminMenu = isAdmin ? (
    <Link
      href="/admin"
      aria-current={adminActive ? "page" : undefined}
      className={menuItemClass(adminActive)}
    >
      Admin
    </Link>
  ) : null;
  const signOutRow = (
    <button
      type="button"
      onClick={signOut}
      className="shrink-0 whitespace-nowrap text-sm font-medium text-muted transition-colors hover:text-foreground"
    >
      Sign out
    </button>
  );
  const signOutMenu = (
    <button
      type="button"
      onClick={signOut}
      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-soft hover:text-foreground"
    >
      Sign out
    </button>
  );

  return (
    <div className="flex min-w-0 max-w-full shrink-0 items-center gap-3 sm:gap-5">
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 md:hidden [&::-webkit-scrollbar]:hidden">
        {findLink()}
        {primaryPortal ? portalNavLink(primaryPortal, "compact") : null}
      </div>
      <details className="relative shrink-0 md:hidden">
        <summary className={MORE_CHIP_CLASS}>More</summary>
        <div className="absolute right-0 z-50 mt-2 min-w-44 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-panel)]">
          {extraPortals.map((link) => portalNavLink(link, "menu"))}
          {adminMenu}
          {alertsMenu}
          {accountMenu}
          {signOutMenu}
        </div>
      </details>
      <div className="hidden items-center gap-3 sm:gap-5 md:flex">
        {findLink()}
        {adminRow}
        {portalLinks.map((link) => portalNavLink(link, "row"))}
        {alertsRow}
        {accountRow}
        {signOutRow}
      </div>
    </div>
  );
}
