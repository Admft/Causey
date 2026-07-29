"use client";

import { useState } from "react";
import { sendRecommendation } from "@/lib/actions/recommendations";
import type { RecommendTarget } from "@/lib/data/portal";

/** Event-page aside: send this event to linked children / club-mates. */
export function RecommendEventPanel({
  competitionId,
  eventSlug,
  targets,
}: {
  competitionId: string;
  eventSlug: string;
  targets: RecommendTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  async function onSend() {
    setError(null);
    setPending(true);
    try {
      const result = await sendRecommendation({
        competitionId,
        eventSlug,
        toProfileIds: [...selected],
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(result.sent);
      setSelected(new Set());
      setNote("");
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold text-foreground">Recommend this event</h2>
      {sent !== null && !open ? (
        <p className="mt-2 text-sm text-muted-strong">
          Sent to {sent} {sent === 1 ? "person" : "people"}.
        </p>
      ) : null}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30"
        >
          {sent !== null ? "Recommend to more people" : "Pick who to send it to"}
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {targets.map((target) => (
              <label
                key={target.profile_id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  disabled={pending}
                  checked={selected.has(target.profile_id)}
                  onChange={() => toggle(target.profile_id)}
                />
                {target.display_name}
                <span className="text-2xs text-muted">{target.context}</span>
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              Note (optional)
            </span>
            <input
              className="field"
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="This one looks right for you"
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-brand-red" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !selected.size}
              onClick={onSend}
              className="cta-enabled disabled:opacity-60"
            >
              {pending ? "Sending…" : `Send to ${selected.size || "…"}`}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-strong hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
