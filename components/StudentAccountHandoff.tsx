"use client";

import { useState } from "react";

export function StudentAccountHandoff() {
  const [status, setStatus] = useState<string | null>(null);

  async function copySignupLink() {
    const signupUrl = new URL("/signup?role=student", window.location.origin);
    try {
      await navigator.clipboard.writeText(signupUrl.toString());
      setStatus(
        "Student signup link copied. Send it to the student, or open it on their phone or in a private window — not this tab."
      );
    } catch {
      setStatus(
        `Copy this link for the student: ${signupUrl.toString()}`
      );
    }
  }

  return (
    <section
      id="student-account-setup"
      className="section-rule mt-8 scroll-mt-24 pt-8"
      aria-labelledby="student-account-setup-heading"
    >
      <h2
        id="student-account-setup-heading"
        className="font-display text-xl font-bold text-foreground"
      >
        Set up the student on their device
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Students need their own Causey login. Stay signed in here as the parent.
        Do not open the student signup link in this browser — that would switch
        you out of your parent session. Use the student’s email, not yours.
      </p>
      <div className="mt-4 rounded-xl border border-accent/25 bg-accent-soft/40 p-4">
        <p className="text-sm font-semibold text-foreground">
          Keep this parent session
        </p>
        <p className="mt-1 text-sm text-muted-strong">
          This device stays on Family. The student creates and confirms their
          account on another device or in a private window, then you link with
          their account email below.
        </p>
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-strong">
        <li>Copy and send the student signup link (or open it on their device).</li>
        <li>
          The student creates and confirms their account with{" "}
          <span className="font-semibold text-foreground">their</span> email.
        </li>
        <li>
          Return here (still signed in as the parent) and use “Link a student”
          with that email.
        </li>
        <li>The student accepts the Family request from Plan.</li>
      </ol>
      <button
        type="button"
        onClick={copySignupLink}
        className="mt-5 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
      >
        Copy student signup link
      </button>
      {status ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
