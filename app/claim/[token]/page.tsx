import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimInvitationButton } from "@/components/ClaimInvitationButton";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Claim organization invitation",
  description: "Join a district, school, club, or team on Causey.",
};

export default async function ClaimInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/i.test(token)) notFound();
  const user = await getSessionUser();
  const next = `/claim/${token}`;

  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Organization invitation</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Join with your own account
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        This invitation gives you a role in a school or district workspace.
        Causey never issues shared or temporary passwords.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-panel)]">
        {user ? (
          <>
            <h2 className="font-display text-xl font-bold text-foreground">
              Accept this invitation
            </h2>
            <p className="mt-2 text-sm text-muted">
              The invitation must match the email on your signed-in account.
            </p>
            <div className="mt-5">
              <ClaimInvitationButton token={token} />
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-foreground">
              Sign in or create your account first
            </h2>
            <p className="mt-2 text-sm text-muted">
              You will return here automatically without losing the invitation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="cta-enabled"
              >
                Sign in to accept
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(next)}`}
                className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-red/35 hover:text-brand-red"
              >
                Create an account
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
