import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimInvitationAuth } from "@/components/ClaimInvitationAuth";
import { ClaimInvitationButton } from "@/components/ClaimInvitationButton";
import { getSessionUser } from "@/lib/auth/session";
import { getOrganizationInvitationPreview } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Claim organization invitation",
  description: "Join a district, school, club, or team on Causey.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  assistant_coach: "Assistant coach",
  coach: "Coach",
  school_admin: "School administrator",
  district_admin: "District administrator",
};

export default async function ClaimInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/i.test(token)) notFound();
  const [user, invitation] = await Promise.all([
    getSessionUser(),
    getOrganizationInvitationPreview(token),
  ]);
  const next = `/claim/${token}`;

  if (!invitation) {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          Organization invitation
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          This invitation is unavailable
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted">
          The link is invalid, expired, or already used. Ask the organization
          administrator for a new invitation before creating an account.
        </p>
        <Link
          href="/#search"
          className="mt-6 inline-flex text-sm font-semibold text-brand-red hover:underline"
        >
          Search tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Organization invitation</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Join {invitation.org_name}
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        You were invited as{" "}
        <strong className="font-semibold text-foreground">
          {ROLE_LABELS[invitation.member_role] ?? invitation.member_role}
        </strong>
        . Sign in with {invitation.email_hint}; Causey never issues shared or
        temporary passwords.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-panel)]">
        <ClaimInvitationAuth
          invitation={invitation}
          next={next}
          signedIn={Boolean(user)}
          signedInEmail={user?.email ?? null}
          claimControl={<ClaimInvitationButton token={token} />}
        />
      </section>
    </div>
  );
}
