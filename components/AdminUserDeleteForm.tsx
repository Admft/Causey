"use client";

import { FormEvent, useState, useTransition } from "react";
import { adminDeleteUser } from "@/lib/actions/admin";

export function AdminUserDeleteForm({
  profileId,
  email,
  displayName,
  onDeleted,
}: {
  profileId: string;
  email: string;
  displayName: string;
  onDeleted?: () => void;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const expected = email.trim().toLowerCase();
  const typed = confirmationEmail.trim().toLowerCase();
  const matches = Boolean(expected) && typed === expected;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!matches) {
      setError("Type the account email exactly to confirm deletion.");
      return;
    }
    const label = displayName || email;
    if (
      !window.confirm(
        `Permanently delete ${label} (${email})? This cannot be undone.`
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminDeleteUser({
        profileId,
        confirmationEmail,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Account deleted and added to the admin audit log.");
      onDeleted?.();
    });
  }

  if (!email) {
    return (
      <p className="mt-6 text-xs text-muted">
        This account has no email on file, so it cannot be deleted from here.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <p className="text-xs font-semibold text-muted-strong">Delete account</p>
      <p className="text-xs text-muted">
        Permanently removes this login and profile. Type{" "}
        <span className="font-semibold text-foreground">{email}</span> to
        confirm.
      </p>
      <label>
        <span className="sr-only">Type the email to confirm deletion</span>
        <input
          className="field mt-1"
          type="email"
          autoComplete="off"
          value={confirmationEmail}
          onChange={(event) => setConfirmationEmail(event.target.value)}
          placeholder={email}
          disabled={isPending}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !matches}
        className="cta-enabled justify-self-start disabled:opacity-60"
      >
        {isPending ? "Deleting account…" : "Delete this account"}
      </button>
      {message ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
