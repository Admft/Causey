"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { closeSupportReport, replyToSupportReport } from "@/lib/actions/support";
import { SUPPORT_REPORT_MAX_BODY } from "@/lib/support";

export function AdminSupportReplyForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await replyToSupportReport({ reportId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setMessage(
        "Reply sent. They get email, and an Alert if they have a Causey account."
      );
      router.refresh();
    } catch {
      setError("Could not send the reply. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Reply</span>
        <textarea
          className="field min-h-32"
          required
          maxLength={SUPPORT_REPORT_MAX_BODY}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-ok" role="status">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="cta-enabled w-fit disabled:opacity-60">
        {pending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}

export function AdminSupportCloseButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setPending(true);
    setError(null);
    try {
      const result = await closeSupportReport({ reportId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not close the report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={close}
        disabled={pending}
        className="inline-flex w-fit items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        {pending ? "Closing…" : "Close report"}
      </button>
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
