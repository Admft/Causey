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
          or sign in with that address — a roster join code still works if the
          student account already exists.
        </p>
        <div className="mt-5">
          <ClaimSignOutButton />
        </div>
      </>
    );
  }

  if (signedIn) {
    return (
      <>
        <h2 className="font-display text-xl font-bold text-foreground">
          Accept this invitation
        </h2>
        <p className="mt-2 text-sm text-muted">
          The signed-in email must match {invitation.email_hint}.
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
          : `Create a ${roleLabel.toLowerCase()} account or sign in.`}{" "}
        You will return here automatically without losing the invitation.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={loginHref} className="cta-enabled">
          Sign in to accept
        </Link>
        <Link
          href={signupHref}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-red/35 hover:text-brand-red"
        >
          {invitation.member_role === "student"
            ? "Create a student account"
            : "Create staff account"}
        </Link>
      </div>
    </>
  );
}

function ClaimSignOutButton() {
  return (
    <button
      type="button"
      className="cta-enabled"
      // Back to sign-in rather than a refresh in place: the point of this
      // button is to arrive as the invited person, not to sit on the claim
      // page signed out.
      onClick={() => void signOutAndLeave("/login")}
    >
      Sign out to use the invited email
    </button>
  );
}
