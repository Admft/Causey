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
        Your child confirms the link from their account page — nothing is
        shared until they accept.
      </p>
      {message ? <p className="text-sm text-muted-strong">{message}</p> : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
