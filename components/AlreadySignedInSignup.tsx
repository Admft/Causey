import Link from "next/link";
import type { AccountRole } from "@/lib/auth/types";
import { workspaceOpenCta } from "@/lib/portal-copy";

/**
 * Generic gate when someone who already has a Causey session opens /signup.
 * Avoids replacing the current session with a second account.
 */
export function AlreadySignedInSignup({ role }: { role: AccountRole }) {
  const workspace = workspaceOpenCta(role);

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
        <Link href={workspace.href} className="cta-enabled inline-flex">
          {workspace.label}
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
