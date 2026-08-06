"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimOrganizationInvitation } from "@/lib/actions/district";

export function ClaimInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    try {
      const result = await claimOrganizationInvitation(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orgs/${result.slug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className="cta-enabled disabled:opacity-60"
      >
        {pending ? "Joining…" : "Accept invitation"}
      </button>
      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
