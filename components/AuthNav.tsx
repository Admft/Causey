"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Sign in / Account controls for the primary nav.
 * Renders nothing useful if Supabase env is missing (mock-only mode).
 * Signed-in users get a role-aware portal link next to Account.
 */
export function AuthNav() {
  const router = useRouter();
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
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red"
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

  const portalLink =
    role === "parent"
      ? { href: "/family", label: "Family" }
      : role === "coach"
        ? { href: "/orgs", label: "My organizations" }
        : role === "student"
          ? { href: "/orgs", label: "My clubs" }
          : null;

  return (
    <div className="flex items-center gap-3">
      {isAdmin ? (
        <Link
          href="/admin"
          className="text-sm font-semibold text-brand-red transition-colors hover:text-foreground"
        >
          Admin
        </Link>
      ) : null}
      {portalLink ? (
        <Link
          href={portalLink.href}
          className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
        >
          {portalLink.label}
        </Link>
      ) : null}
      <Link
        href="/me"
        className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
      >
        Account
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
