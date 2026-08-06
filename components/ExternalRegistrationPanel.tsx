"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  setExternalRegistrationStatus,
  type ExternalRegistrationStatus,
} from "@/lib/actions/external-registrations";

export function ExternalRegistrationPanel({
  competitionId,
  eventSlug,
  registrationHost,
  initialStatus,
  signedIn,
}: {
  competitionId: string;
  eventSlug: string;
  registrationHost: string;
  initialStatus: ExternalRegistrationStatus | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registrationHref = `/event/${eventSlug}/register`;

  async function respond(next: "registered" | "not_registered") {
    if (pending) return;
    const previous = status;
    setPending(true);
    setError(null);
    setStatus(next);
    try {
      const result = await setExternalRegistrationStatus({
        competitionId,
        eventSlug,
        status: next,
      });
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setStatus(previous);
      setError("Could not save the registration status. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (status === "registered") {
    return (
      <section
        className="mt-6 rounded-xl border border-brand-red/25 bg-accent-soft p-4"
        aria-labelledby="external-registration-status"
        aria-live="polite"
      >
        <h2
          id="external-registration-status"
          className="text-base font-semibold text-foreground"
        >
          Registration marked complete
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-strong">
          Causey will keep this tournament in My tournaments. The organizer
          remains the source of truth for your entry and payment.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <a
            href={registrationHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-red hover:underline"
            aria-label={`Open ${registrationHost} in a new tab`}
          >
            Open {registrationHost} <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("not_registered")}
            className="text-sm font-medium text-muted-strong hover:text-foreground disabled:opacity-60"
          >
            {pending ? "Saving…" : "Mark as registration needed"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (signedIn && status === "opened") {
    return (
      <section
        className="mt-6 rounded-xl border border-line bg-surface p-4"
        aria-labelledby="external-registration-question"
        aria-live="polite"
      >
        <h2
          id="external-registration-question"
          className="text-base font-semibold text-foreground"
        >
          Did you finish registering?
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Causey cannot see the organizer&rsquo;s checkout. Confirm here after
          you submit the registration and payment.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("registered")}
            className="cta-enabled disabled:opacity-60"
          >
            {pending ? "Saving…" : "Yes, I registered"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("not_registered")}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/30 hover:text-foreground disabled:opacity-60"
          >
            Not yet
          </button>
          <a
            href={registrationHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-strong hover:text-brand-red"
            aria-label={`Open ${registrationHost} in a new tab`}
          >
            Open registration site again <span aria-hidden="true">↗</span>
          </a>
        </div>
        {error ? (
          <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="mt-6">
      <a
        href={registrationHref}
        target="_blank"
        rel="noopener noreferrer"
        className="cta-enabled"
        aria-label={`Register on ${registrationHost}; opens in a new tab`}
        onClick={() => {
          if (signedIn) setStatus("opened");
        }}
      >
        {status === "not_registered" ? "Continue registration" : "Register"} on{" "}
        {registrationHost} <span aria-hidden="true">↗</span>
      </a>
      <p className="mt-2 max-w-prose text-2xs text-muted">
        Registration and payment happen on the organizer&rsquo;s site, never on
        Causey.
        {!signedIn ? (
          <>
            {" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/event/${eventSlug}`)}`}
              className="font-semibold text-brand-red hover:underline"
            >
              Sign in first
            </Link>{" "}
            if you want Causey to remember this tournament.
          </>
        ) : status === "not_registered" ? (
          <>
            {" "}
            <button
              type="button"
              disabled={pending}
              onClick={() => respond("registered")}
              className="font-semibold text-brand-red hover:underline disabled:opacity-60"
            >
              Already finished? Mark registered
            </button>
          </>
        ) : null}
      </p>
      {error ? (
        <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
