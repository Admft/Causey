"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSetTournamentStatus } from "@/lib/actions/admin";
import { attemptAction } from "@/lib/attempt-action";

type TournamentStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived";

export function AdminTournamentStatusActions({
  competitionId,
  eventSlug,
  status,
}: {
  competitionId: string;
  eventSlug: string;
  status: TournamentStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<TournamentStatus | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(nextStatus: TournamentStatus) {
    setPending(nextStatus);
    setError(null);
    try {
      const result = await attemptAction(() =>
        adminSetTournamentStatus({
          competitionId,
          eventSlug,
          status: nextStatus,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmingArchive(false);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {status === "draft" ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus("published")}
            className="action-button"
          >
            {pending === "published" ? "Publishing…" : "Publish"}
          </button>
        ) : null}
        {status === "archived" ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus("published")}
            className="action-button"
          >
            {pending === "published" ? "Restoring…" : "Restore"}
          </button>
        ) : null}
        {status === "rejected" ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus("draft")}
            className="action-button"
          >
            {pending === "draft" ? "Moving…" : "Move to draft"}
          </button>
        ) : null}
        {status === "pending_review" ? (
          <Link
            href="/admin/moderation"
            className="action-button"
          >
            Review
          </Link>
        ) : null}
        {status === "draft" ||
        status === "published" ||
        status === "rejected" ? (
          confirmingArchive ? (
            <>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => changeStatus("archived")}
                className="action-button action-button--reversal"
              >
                {pending === "archived" ? "Archiving…" : "Confirm archive"}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => setConfirmingArchive(false)}
                className="action-button"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingArchive(true)}
                className="action-button action-button--reversal"
            >
              Archive
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
