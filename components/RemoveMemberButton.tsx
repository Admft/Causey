"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeMember } from "@/lib/actions/orgs";
import { attemptAction } from "@/lib/attempt-action";

export function RemoveMemberButton({
  orgId,
  orgSlug,
  profileId,
  displayName,
}: {
  orgId: string;
  orgSlug: string;
  profileId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRemove() {
    setError(null);
    setPending(true);
    try {
      const result = await attemptAction(() =>
        removeMember(orgId, orgSlug, profileId)
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="min-h-10 font-semibold text-brand-red hover:underline disabled:opacity-60"
        >
          {pending ? "Removing…" : `Remove ${displayName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-10 text-muted-strong hover:text-foreground"
        >
          Cancel
        </button>
        {error ? (
          <span className="basis-full font-medium text-brand-red" role="alert">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="min-h-10 text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Remove
    </button>
  );
}
