import type { Metadata } from "next";
import { ClaimInvitationAuth } from "@/components/ClaimInvitationAuth";
import { ClaimCodeForm } from "@/components/ClaimCodeForm";
import { ClaimCodeInvitationButton } from "@/components/ClaimCodeInvitationButton";
import { getSessionUser } from "@/lib/auth/session";
import {
  formatActivationCode,
  isValidActivationCode,
  normalizeActivationCode,
} from "@/lib/invitations/activation-code";
import { getOrganizationInvitationPreviewByCode } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Enter an activation code",
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

export default async function ClaimCodePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: rawCode } = await searchParams;
  const code = rawCode ? normalizeActivationCode(rawCode) : "";
  const submitted = Boolean(rawCode);

  const [user, invitation] = await Promise.all([
    getSessionUser(),
    isValidActivationCode(code)
      ? getOrganizationInvitationPreviewByCode(code)
      : Promise.resolve(null),
  ]);

  if (!invitation) {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          Organization invitation
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Enter your activation code
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted">
          Your district or school administrator can read you an eight-character
          code. If they emailed you a link instead, open that link — it does the
          same thing.
        </p>

        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-panel)]">
          <ClaimCodeForm initialCode={rawCode ?? ""} />
          {submitted ? (
            <p
              className="mt-4 text-sm font-medium text-brand-red"
              role="alert"
            >
              That code is invalid, expired, or already used. Ask whoever set up
              your organization for a new one.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const next = `/claim?code=${encodeURIComponent(code)}`;

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">
        Organization invitation
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Join {invitation.org_name}
      </h1>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Code{" "}
        <span className="font-mono font-semibold tracking-[0.18em] text-foreground">
          {formatActivationCode(code)}
        </span>{" "}
        invites you as{" "}
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
          claimControl={<ClaimCodeInvitationButton code={code} />}
        />
      </section>
    </div>
  );
}
