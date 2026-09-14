"use client";

import Link from "next/link";
import { signOutAndLeave } from "@/lib/auth/sign-out";
import type { ReactNode } from "react";
import {
  claimSignupHref,
  invitationEmailHintMatches,
} from "@/lib/invitations/claim-path";

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  assistant_coach: "Assistant coach",
  coach: "Coach",
  school_admin: "School administrator",
  district_admin: "District administrator",
};

export function ClaimInvitationAuth({
  invitation,
  next,
  signedIn,
  signedInEmail,
  claimControl,
}: {
  invitation: {
    member_role: string;
    email_hint: string;
    org_name?: string;
  };
  next: string;
  signedIn: boolean;
  signedInEmail: string | null;
  claimControl: ReactNode;
}) {
  const signupHref = claimSignupHref(next, invitation.member_role);
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const roleLabel =
    ROLE_LABELS[invitation.member_role] ?? invitation.member_role;
  const matches = signedInEmail
    ? invitationEmailHintMatches(signedInEmail, invitation.email_hint)
    : false;

  if (signedIn && (!signedInEmail || !matches)) {
    return (
      <>
        <h2 className="font-display text-xl font-bold text-foreground">
          This invitation is for a different email
        </h2>
        <p className="mt-2 text-sm text-muted">
          {signedInEmail
            ? `You’re signed in as ${signedInEmail}. `
            : "You’re already signed in. "}
          The invitation is for {invitation.email_hint}. Sign out, then create
          or sign in with that address
          {invitation.member_role === "student"
            ? " — a roster join code still works if the student account already exists"
            : ""}
          .
        </p>
        <div className="mt-5">
          <ClaimSignOutButton next={next} />
        </div>
      </>
    );
  }

  if (signedIn) {
    return (
      <>
        <h2 className="font-display text-xl font-bold text-foreground">
          {invitation.org_name
            ? `Joining ${invitation.org_name}`
            : "Accept this invitation"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Signed in as {signedInEmail}. Causey is assigning the{" "}
          {roleLabel.toLowerCase()} role
          {invitation.org_name ? ` for ${invitation.org_name}` : ""}.
        </p>
        <div className="mt-5">{claimControl}</div>
      </>
    );
  }

  return (
    <>
      <h2 className="font-display text-xl font-bold text-foreground">
        Sign in or create your account first
      </h2>
      <p className="mt-2 text-sm text-muted">
        {invitation.member_role === "student"
          ? "Create a student account or sign in with the invited email."
          : `Create a staff account, then Causey assigns the ${roleLabel.toLowerCase()} role.`}{" "}
        You will return here automatically without losing the invitation.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href={loginHref} className="cta-enabled">
          Sign in to accept
        </Link>
        <Link href={signupHref} className="action-button whitespace-nowrap">
          {invitation.member_role === "student"
            ? "Create a student account"
            : "Create staff account"}
        </Link>
      </div>
    </>
  );
}

function ClaimSignOutButton({ next }: { next: string }) {
  return (
    <button
      type="button"
      className="cta-enabled"
      // Back to sign-in rather than a refresh in place: the point of this
      // button is to arrive as the invited person, not to sit on the claim
      // page signed out.
      onClick={() =>
        void signOutAndLeave(`/login?next=${encodeURIComponent(next)}`)
      }
    >
      Sign out to use the invited email
    </button>
  );
}
