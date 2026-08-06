"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSetTournamentStatus } from "@/lib/actions/admin";

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
      const result = await adminSetTournamentStatus({
        competitionId,
        eventSlug,
        status: nextStatus,
      });
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
            className="font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            {pending === "published" ? "Publishing…" : "Publish"}
          </button>
        ) : null}
        {status === "archived" ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus("published")}
            className="font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            {pending === "published" ? "Restoring…" : "Restore"}
          </button>
        ) : null}
        {status === "rejected" ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus("draft")}
            className="font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            {pending === "draft" ? "Moving…" : "Move to draft"}
          </button>
        ) : null}
        {status === "pending_review" ? (
          <Link
            href="/admin/moderation"
            className="font-semibold text-brand-red hover:underline"
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
                className="font-semibold text-brand-red hover:underline disabled:opacity-60"
              >
                {pending === "archived" ? "Archiving…" : "Confirm archive"}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => setConfirmingArchive(false)}
                className="text-muted-strong hover:text-foreground"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingArchive(true)}
              className="text-muted-strong hover:text-brand-red"
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
