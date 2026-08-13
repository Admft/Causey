"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setRsvp } from "@/lib/actions/entrants";
import type { EntrantStatus } from "@/lib/auth/orgs";

/**
 * Two-button RSVP. Works for yourself and — when profileId is a linked
 * child — on their behalf (RLS decides what the caller may touch).
 */
type RsvpButtonsProps = {
  competitionId: string;
  profileId: string;
  status: EntrantStatus;
  eventSlug?: string;
};

export function RsvpButtons(props: RsvpButtonsProps) {
  return (
    <RsvpButtonState
      key={`${props.competitionId}:${props.profileId}:${props.status}`}
      {...props}
    />
  );
}

function RsvpButtonState({
  competitionId,
  profileId,
  status,
  eventSlug,
}: RsvpButtonsProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<EntrantStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function respond(next: "going" | "not_going") {
    if (pending || current === next) return;
    setError(null);
    setConfirmation(null);
    setPending(true);
    const previous = current;
    setCurrent(next);
    try {
      const result = await setRsvp({
        competitionId,
        profileId,
        status: next,
        eventSlug,
      });
      if (!result.ok) {
        setCurrent(previous);
        setError(result.error);
        return;
      }
      setConfirmation(
        next === "going"
          ? "RSVP saved. Your organization can see that you’re going."
          : "RSVP saved. Your organization can see that you can’t attend."
      );
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("Could not save your RSVP. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function buttonClass(active: boolean) {
    return active
      ? "rounded-md border border-brand-red/25 bg-accent-soft px-3 py-1.5 text-sm font-semibold text-brand-red"
      : "rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-muted-strong transition-colors hover:border-brand-red/30 hover:text-foreground";
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("going")}
          aria-pressed={current === "going"}
          className={buttonClass(current === "going")}
        >
          {pending && current === "going" ? "Saving…" : "Going"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("not_going")}
          aria-pressed={current === "not_going"}
          className={buttonClass(current === "not_going")}
        >
          {pending && current === "not_going" ? "Saving…" : "Can't go"}
        </button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      {confirmation ? (
        <p className="text-xs text-muted-strong" role="status">
          {confirmation} You can change this answer here if your plans change.
        </p>
      ) : null}
    </div>
  );
}
