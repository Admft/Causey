"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishTournament } from "@/lib/actions/tournaments";

/**
 * Organizer events are created as drafts (SEC-06), so this is the one place a
 * hosted tournament becomes publicly discoverable. Kept as a deliberate step
 * with the details spelled out rather than a toggle buried in the edit form.
 */
export function PublishTournamentPanel({
  competitionId,
  eventSlug,
  visibility,
}: {
  competitionId: string;
  eventSlug: string;
  visibility: "public" | "private";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPublish() {
    setPending(true);
    setError(null);
    try {
      const result = await publishTournament({ competitionId, eventSlug });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-red/30 bg-accent-soft p-5">
      <h2 className="text-base font-semibold text-foreground">
        This tournament is a draft
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-strong">
        {visibility === "public"
          ? "Only you and your organization's coaches can see it. Publishing adds it to chess search, where anyone can find it."
          : "Only you and your organization's coaches can see it. Publishing makes it visible to your members, not to the public."}
      </p>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Check the date, venue, entry fee, and registration link before you
        publish.{" "}
        <Link
          href={`/event/${eventSlug}/edit`}
          className="font-semibold text-brand-red hover:underline"
        >
          Edit details
        </Link>
      </p>
      <button
        type="button"
        onClick={onPublish}
        disabled={pending}
        className="cta-enabled mt-4 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish tournament"}
      </button>
      {error ? (
        <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
