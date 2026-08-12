"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Sign in / Account controls for the primary nav.
 * Mobile uses short labels so Chess + portal + Account + Sign out stay one
 * row; full wording returns at sm+.
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
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasOrgStaffAccess, setHasOrgStaffAccess] = useState(false);
  const [hasDistrictAccess, setHasDistrictAccess] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!configured) {
      setEmail(null);
      return;
    }
    const supabase = createBrowserSupabaseClient();

    async function loadAccess(userId: string | undefined) {
      if (!userId) {
        setRole(null);
        setIsAdmin(false);
        setHasOrgStaffAccess(false);
        setHasDistrictAccess(false);
        setUnreadAlerts(0);
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
          .select("role")
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
      setRole((profileResult.data?.role as AccountRole) ?? null);
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

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      void loadAccess(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      void loadAccess(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
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
    label: hasDistrictAccess ? "Districts & schools" : "My organizations",
    shortLabel: hasDistrictAccess ? "District" : "Orgs",
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

  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-5">
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
