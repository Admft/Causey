"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutAndLeave } from "@/lib/auth/sign-out";

/**
 * Signed in, but the profile row never arrived. Telling someone to "sign out
 * and back in" without giving them a way to do either leaves them on a page
 * with no next step, which is the one outcome this must not produce.
 */
export function ProfileNotReady({ section }: { section: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
        {section} is not loading
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        You&rsquo;re signed in, but Causey could not finish loading your
        profile. This is usually a connection hiccup. Try again, or sign out
        and back in.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="cta-enabled inline-flex"
          disabled={retrying || leaving}
          onClick={() => {
            setRetrying(true);
            router.refresh();
            // Nothing here resolves when the refresh lands, so re-enable on a
            // timer rather than leaving the button dead after a failed retry.
            setTimeout(() => setRetrying(false), 4000);
          }}
        >
          {retrying ? "Trying again…" : "Try again"}
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void signOutAndLeave("/login");
          }}
        >
          {leaving ? "Signing out…" : "Sign out and back in"}
        </button>
        <Link
          href="/support"
          className="text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
        >
          Report a problem
        </Link>
      </div>
    </div>
  );
}
