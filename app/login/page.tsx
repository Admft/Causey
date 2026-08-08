import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { RoleRouteCards } from "@/components/RoleRouteCards";
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

  const copyColumn = (
    <div className="animate-rise min-w-0 max-w-xl md:col-start-1 md:row-start-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Account
      </p>
      <h1 className="mt-2 max-w-[20ch] font-display text-display-lg font-bold tracking-tight text-foreground">
        {heading}
      </h1>
      <p className="mt-3 max-w-prose text-md text-muted">{supporting}</p>
    </div>
  );

  const formCard = (
    <div className="animate-rise animate-rise-delay-1 min-w-0 md:col-start-2 md:row-start-1 md:row-span-2 md:self-center">
      {claimUnavailable ? (
        <Link
          href="/chess"
          className="card-lift group flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6"
        >
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              Search tournaments
            </p>
            <p className="mt-1 text-sm text-muted">
              Indexed feeds and club-published events, open without an account.
            </p>
          </div>
          <span
            aria-hidden="true"
            className="nudge-x shrink-0 text-xl text-brand-red"
          >
            →
          </span>
        </Link>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
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

  const invitePanel = (
    <div className="animate-rise animate-rise-delay-2 min-w-0 max-w-xl rounded-2xl border border-brand-blue/45 bg-brand-blue-soft/50 p-5 sm:p-6 md:col-start-1 md:row-start-2">
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
        {isStaffClaim ? "Create staff account" : "Create student account"}
      </Link>
    </div>
  );

  const roleRouting = (
    <div className="animate-rise animate-rise-delay-2 min-w-0 max-w-xl md:col-start-1 md:row-start-2">
      <h2 className="text-sm font-semibold text-foreground">New to Causey?</h2>
      <RoleRouteCards />
      <details className="mt-3 rounded-xl border border-brand-blue/45 bg-surface/80 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted-strong">
          Coach or organizer?
        </summary>
        <p className="mt-2 text-sm text-muted">
          Start a club, invite students with a join code, and publish your own
          tournaments next to the feeds Causey indexes.
        </p>
        <Link
          href="/signup?role=coach"
          className="mt-3 inline-flex text-sm font-semibold text-brand-red hover:underline"
        >
          Create a coach account
        </Link>
      </details>
    </div>
  );

  return (
    <section className="access-grid">
      {/*
        Two-column from md: task copy left, form card right spanning both rows
        so it centers against copy + the block below. DOM order follows each
        state's real need on mobile — returning users hit the form first,
        invitees hit the create-account panel first. The coordinate grid is
        the access motif (design system §7): signing in is the access moment.
      */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14 lg:py-20">
        {isJoiningOrganization || isClaimingInvitation ? (
          <>
            {copyColumn}
            {invitePanel}
            {formCard}
          </>
        ) : (
          <>
            {copyColumn}
            {formCard}
            {claimUnavailable ? null : roleRouting}
          </>
        )}
      </div>
    </section>
  );
}
