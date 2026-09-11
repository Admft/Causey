"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { respondToLink } from "@/lib/actions/household";

export type HouseholdLinkState = "awaiting_me" | "awaiting_them" | "linked";

/**
 * Accept, decline, cancel, or unlink a family link. Whoever opened the request
 * cannot accept it, so an outgoing request only offers to cancel.
 */
export function HouseholdRequestActions({
  counterpartyProfileId,
  state,
  unlinkLabel = "Unlink",
  confirmUnlinkLabel = "Yes, unlink",
}: {
  counterpartyProfileId: string;
  state: HouseholdLinkState;
  unlinkLabel?: string;
  confirmUnlinkLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  async function respond(accept: boolean) {
    setError(null);
    setPending(true);
    try {
      const result = await respondToLink(counterpartyProfileId, accept);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmingUnlink(false);
      router.refresh();
    } catch {
      setError("Could not update this family link. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {state === "linked" ? (
        confirmingUnlink ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => respond(false)}
              className="action-button action-button--reversal"
            >
              {pending ? "Unlinking…" : confirmUnlinkLabel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingUnlink(false)}
              className="action-button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setConfirmingUnlink(true);
            }}
            className="action-button action-button--reversal"
          >
            {unlinkLabel}
          </button>
        )
      ) : state === "awaiting_them" ? (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted">
            Waiting for them
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(false)}
            className="action-button action-button--reversal"
          >
            {pending ? "Canceling…" : "Cancel request"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(true)}
            className="action-button action-button--selected"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(false)}
            className="action-button"
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
