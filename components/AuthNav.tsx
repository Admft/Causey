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
        return;
      }
      const [profileResult, adminResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle(),
        supabase.rpc("is_platform_admin"),
      ]);
      setRole((profileResult.data?.role as AccountRole) ?? null);
      setIsAdmin(adminResult.error ? false : adminResult.data === true);
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

  const portalLinks =
    role === "parent"
      ? [{ href: "/family", label: "Family", shortLabel: "Family" }]
      : role === "coach"
        ? [
            {
              href: "/orgs",
              label: "My organizations",
              shortLabel: "Orgs",
            },
          ]
        : role === "student"
          ? [
              {
                href: "/me",
                label: "My tournaments",
                shortLabel: "Plan",
              },
              { href: "/orgs", label: "My clubs", shortLabel: "Clubs" },
            ]
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
        aria-label="Notifications"
        aria-current={
          pathname.startsWith("/me/notifications") ? "page" : undefined
        }
        className={navLinkClass(pathname.startsWith("/me/notifications"))}
      >
        <span className="sm:hidden">Alerts</span>
        <span className="hidden sm:inline">Notifications</span>
      </Link>
      {role !== "student" ? (
        <Link
          href="/me"
          aria-current={pathname === "/me" ? "page" : undefined}
          className={navLinkClass(pathname === "/me")}
        >
          Account
        </Link>
      ) : null}
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
