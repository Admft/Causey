"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { requestGuardianLink } from "@/lib/actions/household";

/**
 * Student-side ask: link a parent who already has an account, or hand off a
 * signup link to one who doesn't. The result never says whether the address
 * matched an account, so this cannot be used to probe for parents.
 */
export function GuardianLinkRequestForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const result = await requestGuardianLink(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setEmail("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function copyParentSignupLink() {
    const signupUrl = new URL("/signup?role=parent", window.location.origin);
    try {
      await navigator.clipboard.writeText(signupUrl.toString());
      setCopyStatus(
        "Parent signup link copied. Send it to them — don’t open it in this browser, or you’ll be signed out of your own account."
      );
    } catch {
      setCopyStatus(`Send them this link: ${signupUrl.toString()}`);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Ask a parent to link
      </h3>
      <p className="mt-1 text-sm text-muted">
        Linking lets a parent see your invitations and answer them with you.
        Your school is not involved, and you can unlink at any time.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">
            Parent or guardian email
          </span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="parent@example.com"
          />
        </label>
        {error ? (
          <p className="text-sm font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-strong" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled w-fit disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send link request"}
        </button>
      </form>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-sm text-muted">
          If they don’t have a Causey account yet, they need to create one
          first. Their account has to be a parent account, not yours.
        </p>
        <button
          type="button"
          onClick={copyParentSignupLink}
          className="mt-3 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
        >
          Copy parent signup link
        </button>
        {copyStatus ? (
          <p className="mt-2 text-xs text-muted" role="status">
            {copyStatus}
          </p>
        ) : null}
      </div>
    </div>
  );
}
