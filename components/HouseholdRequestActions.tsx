"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { respondToLink } from "@/lib/actions/household";

/** Student-side accept/decline for a parent link request (on /me). */
export function HouseholdRequestActions({
  parentProfileId,
  linked,
}: {
  parentProfileId: string;
  linked: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setError(null);
    setPending(true);
    try {
      const result = await respondToLink(parentProfileId, accept);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {linked ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
        >
          Unlink
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(true)}
            className="rounded-md border border-brand-red/25 bg-accent-soft px-3 py-1.5 text-sm font-semibold text-brand-red disabled:opacity-60"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(false)}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
