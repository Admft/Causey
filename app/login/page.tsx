import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
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
  } else if (isClaimNextPath(next) && !invitation) {
    heading = "This invitation is unavailable";
    supporting =
      "The claim link is invalid, expired, or already used. Ask the organization administrator for a new invitation.";
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Account
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {heading}
      </h1>
      <p className="mt-3 text-sm text-muted">{supporting}</p>

      {isJoiningOrganization || isClaimingInvitation ? (
        <div className="mt-6 rounded-2xl border border-accent/25 bg-accent-soft/40 p-5">
          <h2 className="font-display text-lg font-bold text-foreground">
            {isStaffClaim
              ? "New staff member?"
              : isJoiningOrganization
                ? "New student?"
                : "Need an account?"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isStaffClaim
              ? "Create a coach or organizer account with your own password. Staff invites do not need a student date of birth."
              : isJoiningOrganization
                ? "Most people opening a coach invite need to create an account first."
                : "Create the matching account type, then you’ll return here to accept."}
          </p>
          <Link href={signupHref} className="cta-enabled mt-4 inline-flex">
            {isStaffClaim
              ? "Create staff account"
              : "Create student account"}
          </Link>
        </div>
      ) : null}

      {isClaimNextPath(next) && !invitation ? (
        <div className="mt-6">
          <Link
            href="/chess"
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            Search tournaments
          </Link>
        </div>
      ) : (
        <div className="section-rule mt-8 pt-8">
          {isJoiningOrganization || isClaimingInvitation ? (
            <p className="mb-4 text-sm font-semibold text-foreground">
              {isStaffClaim
                ? "Already have a staff account?"
                : "Already have a student account?"}
            </p>
          ) : null}
          <LoginForm
            next={invitation ? next : isClaimNextPath(next) ? undefined : next}
            joiningOrganization={isJoiningOrganization}
            claimingInvitation={isClaimingInvitation}
            claimAccountRole={claimAccountRole}
          />
        </div>
      )}
    </div>
  );
}
