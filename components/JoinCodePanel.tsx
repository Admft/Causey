"use client";

import { useState } from "react";
import { rotateJoinCode } from "@/lib/actions/orgs";
import { formatJoinCode } from "@/lib/org-codes";

/**
 * Coach-side join code: show it big, copy the deep link, rotate when leaked.
 * Rotation keeps existing members — only the code changes.
 */
export function JoinCodePanel({
  orgId,
  orgSlug,
  joinCode,
}: {
  orgId: string;
  orgSlug: string;
  joinCode: string;
}) {
  const [code, setCode] = useState(joinCode);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — the link is /join/" + code);
    }
  }

  async function rotate() {
    setError(null);
    setPending(true);
    try {
      const result = await rotateJoinCode(orgId, orgSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode(result.code);
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold text-foreground">Join code</h3>
      <p className="mt-1 text-xs text-muted">
        Students enter this code (or open the link) to join your roster.
      </p>
      <p className="mt-3 font-mono text-2xl font-bold tracking-[0.18em] text-foreground">
        {formatJoinCode(code)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30"
        >
          {copied ? "Link copied" : "Copy join link"}
        </button>
        {confirming ? (
          <span className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={rotate}
              disabled={pending}
              className="font-semibold text-brand-red hover:underline disabled:opacity-60"
            >
              {pending ? "Rotating…" : "Yes, get a new code"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted-strong hover:text-foreground"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            Get a new code
          </button>
        )}
      </div>
      {confirming ? (
        <p className="mt-2 text-xs text-muted">
          Students who already joined stay on the roster; the old code stops
          working immediately.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
