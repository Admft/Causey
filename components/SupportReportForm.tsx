"use client";

import { FormEvent, useState } from "react";
import { submitSupportReport } from "@/lib/actions/support";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_REPORT_MAX_BODY,
} from "@/lib/support";

export function SupportReportForm({
  initialEmail,
}: {
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [body, setBody] = useState("");
  const [pageLabel, setPageLabel] = useState("");
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await submitSupportReport({
        body,
        email,
        pageLabel,
        screenshot,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setPageLabel("");
      setScreenshot(null);
      setScreenshotName(null);
      setFileKey((current) => current + 1);
      setSuccess(
        result.emailConfigured
          ? "Saved. The founding team gets this by email. If you have a Causey account, replies also show in Alerts."
          : "Saved on Causey. Email is not configured here, so the founding team was not emailed."
      );
    } catch {
      setError("Could not send the report. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Email for a reply
        </span>
        <input
          className="field"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          What went wrong
        </span>
        <textarea
          className="field min-h-32"
          required
          maxLength={SUPPORT_REPORT_MAX_BODY}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What you were trying to do, and what happened instead."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Page or screen (optional)
        </span>
        <input
          className="field"
          value={pageLabel}
          onChange={(event) => setPageLabel(event.target.value)}
          maxLength={200}
          placeholder="/chess, Search, or the phone app"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          Screenshot (optional)
        </span>
        <label className="inline-flex w-fit cursor-pointer items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red">
          <input
            key={fileKey}
            type="file"
            accept={SUPPORT_ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setScreenshot(file);
              setScreenshotName(file?.name ?? null);
            }}
            disabled={pending}
          />
          {screenshotName ? "Choose a different image" : "Add a JPEG, PNG, or WebP"}
        </label>
        {screenshotName ? (
          <p className="text-xs text-muted">{screenshotName}</p>
        ) : (
          <p className="text-xs text-muted">Up to 4 MB. iPhone photos may need to be saved as JPEG.</p>
        )}
      </div>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-ok" role="status">
          {success}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled w-fit disabled:opacity-60">
        {pending ? "Sending…" : "Send problem report"}
      </button>
    </form>
  );
}
