"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminReviewOrganization } from "@/lib/actions/admin";

type VerificationStatus = "pending" | "verified" | "rejected";

export function AdminOrganizationReviewActions({
  orgId,
  orgSlug,
  orgName,
  initialStatus,
  initialNote,
}: {
  orgId: string;
  orgSlug: string;
  orgName: string;
  initialStatus: VerificationStatus;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [writingCorrection, setWritingCorrection] = useState(false);
  const [note, setNote] = useState(initialNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(status: VerificationStatus, correctionNote: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminReviewOrganization({
        orgId,
        orgSlug,
        status,
        note: correctionNote,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWritingCorrection(false);
      setMessage(
        result.status === "verified"
          ? `${orgName} is verified.`
          : result.status === "rejected"
            ? "Correction sent to the organization’s administrators."
            : `${orgName} is back in the review queue.`
      );
      router.refresh();
    });
  }

  function verify() {
    if (
      !window.confirm(
        `Verify ${orgName}? Causey will treat it as trusted in moderation and district workflows.`
      )
    ) {
      return;
    }
    submit("verified", note);
  }

  function sendCorrection() {
    if (!note.trim()) {
      setError("Describe what the organization must correct.");
      return;
    }
    submit("rejected", note.trim());
  }

  function backToPending() {
    if (
      !window.confirm(
        `Move ${orgName} back to pending review? Its current decision stays in the review history.`
      )
    ) {
      return;
    }
    submit("pending", note);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {initialStatus !== "verified" ? (
          <button
            type="button"
            onClick={verify}
            disabled={isPending}
            className="cta-enabled disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Verify organization"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setWritingCorrection((open) => !open);
            setMessage(null);
            setError(null);
          }}
          disabled={isPending}
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/40 hover:text-brand-red disabled:opacity-60"
        >
          {writingCorrection
            ? "Cancel correction"
            : initialStatus === "rejected"
              ? "Edit correction"
              : "Needs correction"}
        </button>
        {initialStatus !== "pending" ? (
          <button
            type="button"
            onClick={backToPending}
            disabled={isPending}
            className="text-xs font-semibold text-muted-strong underline-offset-2 hover:text-brand-red hover:underline disabled:opacity-60"
          >
            Back to pending
          </button>
        ) : null}
      </div>

      {writingCorrection ? (
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              What must be corrected?
            </span>
            <textarea
              className="field min-h-24 resize-y"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              placeholder="Name the missing or inaccurate organization detail."
              disabled={isPending}
            />
          </label>
          <button
            type="button"
            onClick={sendCorrection}
            disabled={isPending}
            className="cta-enabled justify-self-start disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send correction"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
