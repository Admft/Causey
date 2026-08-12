"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { requestChildLink } from "@/lib/actions/household";

export function LinkChildForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const result = await requestChildLink(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setEmail("");
      router.refresh();
    } catch {
      setError(
        "Could not send the link request. Check your connection and try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">
            Your child&rsquo;s account email
          </span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send link request"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Your child needs a student account first, then confirms the link from{" "}
        <span className="font-medium text-foreground">Plan</span> — nothing is
        shared until they accept.
      </p>
      {message ? (
        <div
          className="rounded-xl border border-brand-red/25 bg-accent-soft p-4"
          role="status"
        >
          <p className="text-sm font-semibold text-foreground">
            Link request submitted
          </p>
          <p className="mt-1 text-sm text-muted-strong">{message}</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Next, ask your student to open Plan and accept the Family request.
          </p>
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          <p className="text-sm font-medium text-brand-red">{error}</p>
          <p className="mt-1 text-xs text-muted">
            Your email entry is still here so you can retry.
          </p>
        </div>
      ) : null}
    </form>
  );
}
