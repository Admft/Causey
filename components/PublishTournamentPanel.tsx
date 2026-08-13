"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishTournament } from "@/lib/actions/tournaments";
import type { CompetitionAudience } from "@/lib/schemas";

/**
 * Organizer events are created as drafts (SEC-06), so this is the one place a
 * hosted tournament becomes publicly discoverable. Kept as a deliberate step
 * with the details spelled out rather than a toggle buried in the edit form.
 */
export function PublishTournamentPanel({
  competitionId,
  eventSlug,
  audience,
  orgSlug,
}: {
  competitionId: string;
  eventSlug: string;
  audience: CompetitionAudience;
  orgSlug?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const publicReview = audience === "public";

  async function onPublish() {
    setPending(true);
    setError(null);
    try {
      const result = await publishTournament({ competitionId, eventSlug });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      if (result.status === "pending_review") {
        if (orgSlug) {
          router.push(
            `/orgs/${orgSlug}?submitted=${encodeURIComponent(eventSlug)}`
          );
          router.refresh();
          return;
        }
        setSubmitted(true);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-brand-red/30 bg-accent-soft p-5"
      role={submitted ? "status" : undefined}
    >
      <h2 className="text-base font-semibold text-foreground">
        {submitted
          ? "Submitted for platform review"
          : "This competition is a draft"}
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-strong">
        {submitted
          ? "It is not in public search yet. You can prepare invitations while Causey reviews the listing."
          : publicReview
            ? "Only your organization’s staff can see it. Submit it for platform review before it can appear in public search."
            : "Only your organization’s staff can see it. Publishing makes it visible to the selected members, not to the public."}
      </p>
      {!submitted ? (
        <>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Check the date, venue, entry fee, and registration link before you{" "}
            {publicReview ? "submit" : "publish"}.{" "}
            <Link
              href={`/event/${eventSlug}/edit`}
              className="font-semibold text-brand-red hover:underline"
            >
              Edit details
            </Link>
          </p>
          {confirming ? (
            <div className="mt-4 rounded-xl border border-brand-red/25 bg-white/70 p-4">
              <p className="text-sm font-semibold text-foreground">
                {publicReview
                  ? "Submit this listing for platform review?"
                  : "Publish this competition to members?"}
              </p>
              <p className="mt-1 text-xs text-muted">
                This uses the details and audience shown above. You can cancel
                and edit them before continuing.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={pending}
                  className="cta-enabled disabled:opacity-60"
                >
                  {pending
                    ? publicReview
                      ? "Submitting…"
                      : "Publishing…"
                    : publicReview
                      ? "Yes, submit for review"
                      : "Yes, publish to members"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="text-sm font-medium text-muted-strong hover:text-foreground disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className="cta-enabled mt-4"
            >
              {publicReview ? "Review submission" : "Review publication"}
            </button>
          )}
        </>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
