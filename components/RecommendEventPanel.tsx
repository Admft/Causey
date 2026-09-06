"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sendRecommendation } from "@/lib/actions/recommendations";
import { attemptAction } from "@/lib/attempt-action";
import type { RecommendTarget } from "@/lib/data/portal";

function formatNameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Event-page aside: send this event to linked children / club-mates. */
export function RecommendEventPanel({
  competitionId,
  eventSlug,
  targets,
  alreadySentIds = [],
}: {
  competitionId: string;
  eventSlug: string;
  targets: RecommendTarget[];
  alreadySentIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [localSentIds, setLocalSentIds] = useState<string[]>([]);
  const [lastSentIds, setLastSentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firstTargetRef = useRef<HTMLInputElement>(null);

  const sentIds = useMemo(() => {
    const next = new Set(alreadySentIds);
    for (const id of localSentIds) next.add(id);
    return next;
  }, [alreadySentIds, localSentIds]);

  const remaining = useMemo(
    () => targets.filter((target) => !sentIds.has(target.profile_id)),
    [targets, sentIds]
  );
  const sentTargets = useMemo(
    () => targets.filter((target) => sentIds.has(target.profile_id)),
    [targets, sentIds]
  );
  const lastSentNames = lastSentIds
    .map(
      (id) => targets.find((target) => target.profile_id === id)?.display_name
    )
    .filter((name): name is string => Boolean(name));

  useEffect(() => {
    if (open) firstTargetRef.current?.focus();
  }, [open]);

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
      const result = await attemptAction(() =>
        sendRecommendation({
          competitionId,
          eventSlug,
          toProfileIds: [...selected],
          note,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastSentIds(result.toProfileIds);
      setLocalSentIds((prev) => [...new Set([...prev, ...result.toProfileIds])]);
      setSelected(new Set());
      setNote("");
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const statusText = lastSentNames.length
    ? `Sent to ${formatNameList(lastSentNames)}.`
    : sentTargets.length
      ? `Already sent to ${formatNameList(
          sentTargets.map((target) => target.display_name)
        )}.`
      : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold text-foreground">Recommend this event</h2>
      {statusText && !open ? (
        <div className="mt-2" role="status">
          <p className="text-sm text-muted-strong">{statusText}</p>
          <p className="mt-1 text-xs text-muted">
            They’ll get an Alerts update and see it on Plan.
          </p>
        </div>
      ) : null}
      {!open ? (
        remaining.length ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30"
          >
            {sentIds.size ? "Recommend to more people" : "Pick who to send it to"}
          </button>
        ) : null
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {remaining.map((target, index) => (
              <label
                key={target.profile_id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  ref={index === 0 ? firstTargetRef : undefined}
                  type="checkbox"
                  disabled={pending}
                  checked={selected.has(target.profile_id)}
                  onChange={() => toggle(target.profile_id)}
                />
                {target.display_name}
                <span className="text-2xs text-muted">{target.context}</span>
              </label>
            ))}
            {sentTargets.map((target) => (
              <p
                key={target.profile_id}
                className="flex items-center gap-2 text-sm text-muted"
              >
                <span className="font-medium text-foreground">
                  {target.display_name}
                </span>
                <span className="text-2xs">Sent</span>
                <span className="text-2xs">{target.context}</span>
              </p>
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
