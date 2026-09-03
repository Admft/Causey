import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlreadySignedInSignup } from "@/components/AlreadySignedInSignup";
import { PageBackLink } from "@/components/PageBackLink";
import { ParentStudentSignupGate } from "@/components/ParentStudentSignupGate";
import { SignupForm } from "@/components/SignupForm";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { AccountRoleSchema } from "@/lib/auth/types";
import {
  accountRoleForOrgInvitationRole,
  extractClaimToken,
  isJoinCodeNextPath,
} from "@/lib/invitations/claim-path";
import { getOrganizationInvitationPreview } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a Causey account as a student, parent, or coach. Coaches start a club after signup.",
};

const INVITATION_ROLE_LABELS: Record<string, string> = {
  student: "Student",
  assistant_coach: "Assistant coach",
  coach: "Coach",
  school_admin: "School administrator",
  district_admin: "District administrator",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const { role, next: requestedNext } = await searchParams;
  const parsedRole = AccountRoleSchema.safeParse(role);
  const requestedPath = sanitizeNextPath(requestedNext);
  const claimToken = extractClaimToken(requestedPath);
  const invitation = claimToken
    ? await getOrganizationInvitationPreview(claimToken)
    : null;
  const next = claimToken && !invitation ? undefined : requestedPath;
  const isJoiningOrganization = isJoinCodeNextPath(next);
  const invitationAccountRole = invitation
    ? accountRoleForOrgInvitationRole(invitation.member_role)
    : "student";
  const startingClub =
    !invitation &&
    !isJoiningOrganization &&
    parsedRole.success &&
    parsedRole.data === "coach";

  const user = await getSessionUser();
  if (user) {
    // Claim acceptance belongs on /claim with the matching signed-in email.
    if (claimToken && invitation) {
      redirect(`/claim/${claimToken}`);
    }

    const profile = await getCurrentProfile();
    if (profile) {
      const requestedSignupRole = invitation
        ? invitationAccountRole
        : isJoiningOrganization
          ? "student"
          : parsedRole.success
            ? parsedRole.data
            : "student";

      // Parent + student signup in the same browser would replace the parent session.
      if (
        profile.role === "parent" &&
        requestedSignupRole === "student" &&
        !invitation
      ) {
        return (
          <ParentStudentSignupGate joiningOrganization={isJoiningOrganization} />
        );
      }

      return <AlreadySignedInSignup role={profile.role} />;
    }
  }

  return (
    <section className="access-grid">
      <div className="relative mx-auto max-w-xl px-5 py-10 sm:px-8 sm:py-12">
        <PageBackLink />
        <div className="mt-6 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <p className="text-sm font-semibold text-brand-red">Account</p>
          <h1 className="mt-2 font-display text-display-lg tracking-tight text-foreground">
            {isJoiningOrganization
              ? "Create a student account to join"
              : invitation
                ? `Create a ${
                    invitationAccountRole === "coach" ? "staff" : "student"
                  } account for ${invitation.org_name}`
                : startingClub
                  ? "Create a coach account to start a club"
                  : "Create your Causey account"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {isJoiningOrganization
              ? "This join link is for a student roster. After confirming your email, you’ll return to review the organization before joining."
              : invitation
                ? `This invitation assigns the ${INVITATION_ROLE_LABELS[invitation.member_role] ?? invitation.member_role} role after you confirm your email and accept it.`
                : startingClub
                  ? "Coach is the account type — not a fourth club login. After you confirm email, you create the club, then invite students with a join code and other coaches as staff."
                  : "Students join schools or clubs, parents link to a student, and coaches start a club or team."}
          </p>
          <div className="mt-8">
            <SignupForm
              initialRole={
                isJoiningOrganization
                  ? "student"
                  : invitation
                    ? invitationAccountRole
                    : parsedRole.success
                      ? parsedRole.data
                      : "student"
              }
              next={next}
              joiningOrganization={isJoiningOrganization}
              invitation={
                invitation
                  ? {
                      orgName: invitation.org_name,
                      roleLabel:
                        INVITATION_ROLE_LABELS[invitation.member_role] ??
                        invitation.member_role,
                      accountRole: invitationAccountRole,
                    }
                  : undefined
              }
            />
          </div>
          <p className="mt-6 text-xs text-muted">
            You can search without creating an account.{" "}
            <Link href="/#search" className="font-bold text-muted-strong hover:text-brand-red">
              Keep browsing tournaments
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
