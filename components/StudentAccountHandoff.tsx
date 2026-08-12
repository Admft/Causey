"use client";

import { useState } from "react";

export function StudentAccountHandoff() {
  const [status, setStatus] = useState<string | null>(null);

  async function copySignupLink() {
    const signupUrl = new URL("/signup?role=student", window.location.origin);
    try {
      await navigator.clipboard.writeText(signupUrl.toString());
      setStatus(
        "Student signup link copied. Send it to the student or open it on their device."
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
        Keep this parent session signed in. Send the student signup link to the
        student, or open it in a separate browser profile on their device. They
        should use their own email. After they confirm the account, return here
        and request the family link with that email.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-strong">
        <li>Copy and send the student signup link.</li>
        <li>The student creates and confirms their account on their device.</li>
        <li>Use “Link a student” below with the student&rsquo;s account email.</li>
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
