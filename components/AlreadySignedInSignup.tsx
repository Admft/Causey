import Link from "next/link";
import { homePathForRole } from "@/lib/auth/home-path";
import type { AccountRole } from "@/lib/auth/types";

/**
 * Generic gate when someone who already has a Causey session opens /signup.
 * Avoids replacing the current session with a second account.
 */
export function AlreadySignedInSignup({ role }: { role: AccountRole }) {
  const homeHref = homePathForRole(role);
  const workspaceLabel =
    role === "parent"
      ? "Open Family"
      : role === "coach"
        ? "Open organizations"
        : "Open Plan";

  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        You’re already signed in
      </h1>
      <p className="mt-3 text-sm text-muted">
        Causey keeps one account per person. Creating another account in this
        browser would replace your current session. Return to your workspace,
        or sign out first if you meant to use a different email.
      </p>
      <div className="section-rule mt-8 flex flex-wrap items-center gap-4 pt-8">
        <Link href={homeHref} className="cta-enabled inline-flex">
          {workspaceLabel}
        </Link>
        <Link
          href="/account"
          className="text-sm font-semibold text-muted-strong hover:text-brand-red"
        >
          Account settings
        </Link>
      </div>
    </div>
  );
}
