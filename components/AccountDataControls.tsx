"use client";

import { FormEvent, useState } from "react";
import { deleteOwnAccount } from "@/lib/actions/account-data";
import { signOutAndLeave } from "@/lib/auth/sign-out";

export function AccountDataControls({ email }: { email: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await deleteOwnAccount({ confirmationEmail: confirmation });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await signOutAndLeave("/");
    } catch {
      setError("Could not reach Causey. Check your connection, then try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="text-sm font-semibold text-foreground">Download a copy</h3>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Saves a JSON file of this account, organization memberships, saved
          events, RSVPs, alert preferences, and family links you can already
          see. It does not include other people&rsquo;s private records.
        </p>
        <a href="/api/account/export" className="cta-enabled mt-4 inline-flex w-fit">
          Download account data
        </a>
      </section>

      <section className="border-t border-line pt-8">
        <h3 className="text-sm font-semibold text-foreground">Delete account</h3>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Permanently removes this sign-in and the Causey records attached to
          it. Transfer ownership of any school or club you own first. Type{" "}
          <span className="font-medium text-foreground">{email}</span> to
          confirm.
        </p>
        <form onSubmit={onDelete} className="mt-5 flex max-w-md flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              Confirm email
            </span>
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-brand-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="cta-enabled w-fit disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        </form>
      </section>
    </div>
  );
}
