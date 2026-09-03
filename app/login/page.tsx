import type { Metadata } from "next";
import Link from "next/link";
import { AlreadySignedInSignup } from "@/components/AlreadySignedInSignup";
import { LoginForm } from "@/components/LoginForm";
import { PageBackLink } from "@/components/PageBackLink";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import {
  accountRoleForOrgInvitationRole,
  extractClaimToken,
  isClaimNextPath,
  isJoinCodeNextPath,
} from "@/lib/invitations/claim-path";
import { getOrganizationInvitationPreview } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Causey account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const user = await getSessionUser();
  if (user && !isClaimNextPath(next) && !isJoinCodeNextPath(next)) {
    const profile = await getCurrentProfile();
    if (profile) {
      return <AlreadySignedInSignup role={profile.role} surface="signin" />;
    }
  }
  const isJoiningOrganization = isJoinCodeNextPath(next);
  const claimToken = extractClaimToken(next);
  const invitation = claimToken
    ? await getOrganizationInvitationPreview(claimToken)
    : null;
  const isClaimingInvitation = Boolean(invitation);
  const claimAccountRole = invitation
    ? accountRoleForOrgInvitationRole(invitation.member_role)
    : undefined;
  const isStaffClaim = claimAccountRole === "coach";
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";
  const claimUnavailable = isClaimNextPath(next) && !invitation;

  let heading = "Sign in";
  let supporting = "Use the email and password you created at signup.";
  if (isJoiningOrganization) {
    heading = "Sign in to finish joining";
    supporting =
      "Use the student’s email and password. After signing in, you’ll review the school or club before joining its roster.";
  } else if (isStaffClaim) {
    heading = "Sign in to accept your staff invitation";
    supporting =
      "Use the email that received the invitation. After signing in, you’ll return to claim your school or district role.";
  } else if (isClaimingInvitation) {
    heading = "Sign in to accept your invitation";
    supporting =
      "Use the email that received the invitation. After signing in, you’ll return to claim your place on the roster.";
  } else if (claimUnavailable) {
    heading = "This invitation is unavailable";
    supporting =
      "The claim link is invalid, expired, or already used. Ask the organization administrator for a new invitation.";
  }

  return (
    <section className="access-grid">
      <div className="relative mx-auto max-w-md px-5 py-10 sm:py-12">
        <div className="animate-rise">
          <PageBackLink />
        </div>

        <div className="animate-rise animate-rise-delay-1 mt-6 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Account
          </p>
          <h1 className="mt-2 font-display text-display-lg tracking-tight text-foreground">
            {heading}
          </h1>
          <p className="mt-3 text-md text-muted">{supporting}</p>

          {isJoiningOrganization || isClaimingInvitation ? (
            <div className="mt-6 rounded-2xl border border-brand-blue/45 bg-brand-blue-soft p-5 sm:p-6">
              <h2 className="font-display text-lg text-foreground">
                {isStaffClaim ? "New staff member?" : "New student?"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isStaffClaim
                  ? "Create a coach or organizer account with your own password. Staff invites do not need a student date of birth."
                  : isJoiningOrganization
                    ? "Most people opening a coach invite need to create an account first."
                    : "Create the matching account type, then you’ll return here to accept."}
              </p>
              <Link href={signupHref} className="cta-enabled mt-4 inline-flex">
                {isStaffClaim ? "Create staff account" : "Create student account"}
              </Link>
            </div>
          ) : null}

          {claimUnavailable ? (
            <Link
              href="/#search"
              className="group mt-6 flex items-start justify-between gap-4 border-t border-line pt-6"
            >
              <div className="min-w-0">
                <p className="text-lead font-bold text-foreground">
                  Search tournaments
                </p>
                <p className="mt-1 text-sm text-muted">
                  Find events by zip, including tournaments clubs publish here.
                  No account needed.
                </p>
              </div>
              <span
                aria-hidden="true"
                className="nudge-x shrink-0 text-lg font-bold text-brand-red"
              >
                →
              </span>
            </Link>
          ) : (
            <div className="mt-6 border-t border-line pt-6">
              {isJoiningOrganization || isClaimingInvitation ? (
                <p className="mb-4 text-sm font-bold text-foreground">
                  {isStaffClaim
                    ? "Already have a staff account?"
                    : "Already have a student account?"}
                </p>
              ) : null}
              <LoginForm
                next={
                  invitation ? next : isClaimNextPath(next) ? undefined : next
                }
                joiningOrganization={isJoiningOrganization}
                claimingInvitation={isClaimingInvitation}
                claimAccountRole={claimAccountRole}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
