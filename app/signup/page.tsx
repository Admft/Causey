import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlreadySignedInSignup } from "@/components/AlreadySignedInSignup";
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
    "Create a Causey account as a student, parent, coach, or organizer.",
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
      <div
        className={`relative mx-auto grid items-start gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:py-12 ${
          isJoiningOrganization || invitation
            ? "max-w-3xl"
            : "max-w-5xl md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-10"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-red">Account</p>
          <h1 className="mt-2 font-display text-display-lg tracking-tight text-foreground">
            {isJoiningOrganization
              ? "Create a student account to join"
              : invitation
                ? `Create a ${
                    invitationAccountRole === "coach" ? "staff" : "student"
                  } account for ${invitation.org_name}`
                : "Create your Causey account"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {isJoiningOrganization
              ? "This join link is for a student roster. After confirming your email, you’ll return to review the organization before joining."
              : invitation
                ? `This invitation assigns the ${INVITATION_ROLE_LABELS[invitation.member_role] ?? invitation.member_role} role after you confirm your email and accept it.`
              : "Students join schools or clubs, parents link to a student, and coaches or organizers start rosters and publish tournaments. Pick the account type in the form."}
          </p>
          {!isJoiningOrganization && !invitation ? (
            <div className="mt-6 divide-y divide-line border-y border-line text-sm">
              <p className="py-3">
                <span className="font-bold text-foreground">Search stays free.</span>{" "}
                <span className="text-muted">
                  You can browse directories without an account.{" "}
                  <Link href="/#search" className="font-bold text-muted-strong hover:text-brand-red">
                    Keep browsing tournaments
                  </Link>
                </span>
              </p>
              <p className="py-3">
                <span className="font-bold text-foreground">Clubs are self-serve.</span>{" "}
                <span className="text-muted">
                  A coach account can create a club or team.{" "}
                  <Link href="/clubs" className="font-bold text-muted-strong hover:text-brand-red">
                    See the club workspace
                  </Link>
                </span>
              </p>
              <p className="py-3">
                <span className="font-bold text-foreground">Districts are not.</span>{" "}
                <span className="text-muted">
                  School district workspaces are provisioned by Causey.{" "}
                  <Link href="/districts" className="font-bold text-muted-strong hover:text-brand-red">
                    Review the district pilot
                  </Link>
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-6 text-xs text-muted">
              You can search without creating an account.{" "}
              <Link href="/#search" className="font-bold text-muted-strong hover:text-brand-red">
                Keep browsing tournaments
              </Link>
            </p>
          )}
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
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
      </div>
    </section>
  );
}
