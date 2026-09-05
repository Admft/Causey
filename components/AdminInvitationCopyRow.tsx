"use client";

import { useState } from "react";

export function formatInvitationExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "in 7 days";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminInvitationCopyRow({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied.");
    } catch {
      setStatus("Copy failed — select the text above instead.");
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-strong">{label}</p>
      <p
        className={`mt-1 break-all rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground ${
          mono ? "font-mono tracking-[0.18em]" : ""
        }`}
      >
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
        >
          Copy {label.toLowerCase()}
        </button>
        {status ? (
          <span className="text-xs text-muted" role="status">
            {status}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
