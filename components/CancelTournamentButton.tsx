"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelTournament } from "@/lib/actions/tournaments";
import { attemptAction } from "@/lib/attempt-action";

export function CancelTournamentButton({
  competitionId,
  eventSlug,
  orgSlug,
}: {
  competitionId: string;
  eventSlug: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    setError(null);
    setPending(true);
    try {
      const result = await attemptAction(() =>
        cancelTournament({ competitionId, eventSlug, orgSlug })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orgs/${orgSlug}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-strong">
          This removes the event for everyone — your roster, parents, and the
          public listing. It can&rsquo;t be undone from the app.
        </p>
        <span className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Yes, cancel this competition"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-muted-strong hover:text-foreground"
          >
            Keep it
          </button>
        </span>
        {error ? (
          <p className="text-sm font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="self-start text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Cancel this competition…
    </button>
  );
}
