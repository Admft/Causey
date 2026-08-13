"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { joinOrgWithCode } from "@/lib/actions/orgs";
import { isValidJoinCode } from "@/lib/org-codes";

/** Class-code entry: "2p85-8dz6" in any case/spacing joins the org. */
export function JoinOrgForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidJoinCode(code)) {
      setError("That code didn’t match an organization.");
      return;
    }
    setPending(true);
    try {
      const result = await joinOrgWithCode(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orgs/${result.slug}`);
      router.refresh();
    } catch {
      setError("Could not join this organization. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Join code from your coach
        </span>
        <input
          className="field font-mono uppercase tracking-[0.12em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="2P85-8DZ6"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cta-enabled disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join organization"}
      </button>
      {error ? (
        <p
          className="text-sm font-medium text-brand-red sm:basis-full"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
