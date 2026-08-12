"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminReviewTournament } from "@/lib/actions/admin";

export function ModerationReviewForm({
  competitionId,
  eventSlug,
  tournamentName,
}: {
  competitionId: string;
  eventSlug: string;
  tournamentName: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  async function review(nextDecision: "approve" | "reject") {
    if (nextDecision === "reject" && !note.trim()) {
      setError("Add a review note explaining what needs correction.");
      return;
    }
    if (
      nextDecision === "approve" &&
      !window.confirm(
        `Publish ${tournamentName}? Its public link becomes available immediately; it enters discovery only if that competition type is searchable.`
      )
    ) {
      return;
    }

    setPending(nextDecision);
    setError(null);
    try {
      const result = await adminReviewTournament({
        competitionId,
        eventSlug,
        decision: nextDecision,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDecision(nextDecision);
    } catch {
      setError("The review could not be saved. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  if (decision) {
    return (
      <div
        className="mt-4 rounded-xl border border-accent/25 bg-accent-soft p-4"
        role="status"
      >
        <p className="font-semibold text-foreground">
          {decision === "approve"
            ? `${tournamentName} is published.`
            : `${tournamentName} was not published.`}
        </p>
        <p className="mt-1 text-sm text-muted">
          {decision === "approve"
            ? "The public link is available. Searchable competition types also enter discovery."
            : "The review note is saved with the competition record."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="text-brand-red hover:underline"
          >
            Review next competition
          </button>
          {decision === "approve" ? (
            <Link
              href={`/event/${eventSlug}`}
              className="text-muted-strong hover:text-foreground"
            >
              Open published listing
            </Link>
          ) : (
            <Link
              href={`/admin/tournaments/${competitionId}/edit`}
              className="text-muted-strong hover:text-foreground"
            >
              Open rejected record
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label className="block">
        <span className="text-xs font-semibold text-muted-strong">
          Review note
        </span>
        <textarea
          className="field mt-1 min-h-20 resize-y"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Required when rejecting a listing. Name what needs correction."
          maxLength={1000}
          disabled={pending !== null}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => review("approve")}
          disabled={pending !== null}
          className="cta-enabled disabled:opacity-60"
        >
          {pending === "approve" ? "Publishing…" : "Approve and publish"}
        </button>
        <button
          type="button"
          onClick={() => review("reject")}
          disabled={pending !== null}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/35 hover:text-brand-red disabled:opacity-60"
        >
          {pending === "reject" ? "Rejecting…" : "Reject public listing"}
        </button>
      </div>
    </div>
  );
}
