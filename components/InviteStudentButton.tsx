"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendRecommendation } from "@/lib/actions/recommendations";
import { attemptAction } from "@/lib/attempt-action";

/** One-click invite so a linked student can accept on Plan. */
export function InviteStudentButton({
  competitionId,
  eventSlug,
  profileId,
  forLabel,
  alreadySent = false,
}: {
  competitionId: string;
  eventSlug: string;
  profileId: string;
  forLabel: string;
  alreadySent?: boolean;
}) {
  const router = useRouter();
  const [justSent, setJustSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The refreshed page may report the invite before this click resolves.
  const sent = alreadySent || justSent;

  async function onInvite() {
    if (pending || sent) return;
    setPending(true);
    setError(null);
    try {
      const result = await attemptAction(() =>
        sendRecommendation({
          competitionId,
          eventSlug,
          toProfileIds: [profileId],
          note: "",
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setJustSent(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-strong" role="status">
        Waiting for {forLabel} to answer on Plan. After they mark Going, Family
        asks you to confirm organizer registration.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onInvite()}
        className="cta-enabled inline-flex w-fit disabled:opacity-60"
      >
        {pending ? "Sending…" : `Invite ${forLabel}`}
      </button>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">
          They accept on Plan. Then you confirm organizer registration on
          Family.
        </p>
      )}
    </div>
  );
}
