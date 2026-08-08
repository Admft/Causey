"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminReviewOrganization } from "@/lib/actions/admin";

type VerificationStatus = "pending" | "verified" | "rejected";

export function AdminOrganizationVerificationForm({
  orgId,
  orgSlug,
  initialStatus,
  initialNote,
}: {
  orgId: string;
  orgSlug: string;
  initialStatus: VerificationStatus;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      status !== initialStatus &&
      !window.confirm(
        status === "verified"
          ? "Verify this organization for Causey trust and moderation context?"
          : status === "rejected"
            ? "Reject this organization and share the correction note with its administrators?"
            : "Return this organization to pending review?"
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminReviewOrganization({
        orgId,
        orgSlug,
        status,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.status === "verified"
          ? "Organization verified."
          : result.status === "rejected"
            ? "Organization rejected with a correction note."
            : "Organization returned to pending review."
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label>
        <span className="text-xs font-semibold text-muted-strong">
          Verification decision
        </span>
        <select
          className="field mt-1"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as VerificationStatus)
          }
          disabled={isPending}
        >
          <option value="pending">Pending review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Needs correction</option>
        </select>
      </label>

      {status === "rejected" ? (
        <label>
          <span className="text-xs font-semibold text-muted-strong">
            What must be corrected?
          </span>
          <textarea
            className="field mt-1 min-h-24 resize-y"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            required
            placeholder="Name the missing or inaccurate organization detail."
            disabled={isPending}
          />
        </label>
      ) : null}

      <button
        type="submit"
        className="cta-enabled justify-self-start disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? "Saving review…" : "Save review"}
      </button>
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
    </form>
  );
}
