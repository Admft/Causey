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
          className="action-button action-button--reversal"
        >
          {pending ? "Removing…" : `Remove ${displayName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="action-button"
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
      className="action-button action-button--reversal"
    >
      Remove
    </button>
  );
}
