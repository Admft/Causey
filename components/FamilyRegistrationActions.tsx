"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setExternalRegistrationStatus } from "@/lib/actions/external-registrations";

/**
 * Parent-desk control: open the organizer site for a linked student, then
 * mark registration complete on Causey without leaving the family inbox.
 */
export function FamilyRegistrationActions({
  competitionId,
  eventSlug,
  childProfileId,
  childName,
}: {
  competitionId: string;
  eventSlug: string;
  childProfileId: string;
  childName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const registrationHref = `/event/${eventSlug}/register?for=${encodeURIComponent(
    childProfileId
  )}`;

  async function markComplete() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await setExternalRegistrationStatus({
        competitionId,
        eventSlug,
        status: "registered",
        profileId: childProfileId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not update registration. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-semibold text-muted-strong" aria-live="polite">
        Marked complete for {childName}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={registrationHref}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-enabled inline-flex h-9 px-3 text-sm"
          aria-label={`Open organizer registration for ${childName}; opens in a new tab`}
        >
          Open registration <span aria-hidden="true">↗</span>
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => void markComplete()}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/30 hover:text-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : "Mark complete"}
        </button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-2xs text-muted">
          Finish on the organizer site, then mark it here for {childName}.
        </p>
      )}
    </div>
  );
}
