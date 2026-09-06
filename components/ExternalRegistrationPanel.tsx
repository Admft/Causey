"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  leaveOrganizerTrackedEvent,
  setExternalRegistrationStatus,
  type ExternalRegistrationStatus,
} from "@/lib/actions/external-registrations";
import { attemptAction } from "@/lib/attempt-action";

type ExternalRegistrationPanelProps = {
  competitionId: string;
  eventSlug: string;
  registrationHost: string;
  initialStatus: ExternalRegistrationStatus | null;
  signedIn: boolean;
  /** When true, drop outer section chrome — parent already titled the next step. */
  embedded?: boolean;
  /** Defaults to the signed-in user; parents pass a linked child. */
  profileId?: string;
  /** Shown when acting for someone other than "you". */
  forLabel?: string;
  /**
   * Profile to mark not-going when they leave after a complete mark.
   * Defaults to the signed-in user when omitted.
   */
  rsvpProfileId?: string;
};

export function ExternalRegistrationPanel(
  props: ExternalRegistrationPanelProps
) {
  return (
    <ExternalRegistrationPanelState
      key={`${props.competitionId}:${props.profileId ?? "self"}:${props.initialStatus ?? "none"}`}
      {...props}
    />
  );
}

function ExternalRegistrationPanelState({
  competitionId,
  eventSlug,
  registrationHost,
  initialStatus,
  signedIn,
  embedded = false,
  /** Defaults to the signed-in user; parents pass a linked child. */
  profileId,
  /** Shown when acting for someone other than "you". */
  forLabel,
  rsvpProfileId,
}: ExternalRegistrationPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registrationHref = profileId
    ? `/event/${eventSlug}/register?for=${encodeURIComponent(profileId)}`
    : `/event/${eventSlug}/register`;
  const subject = forLabel ?? "you";
  const whose = forLabel ? `for ${forLabel}` : null;

  async function respond(next: "registered" | "not_registered") {
    if (pending) return;
    const previous = status;
    setPending(true);
    setError(null);
    setStatus(next);
    try {
      const result = await attemptAction(() =>
        setExternalRegistrationStatus({
          competitionId,
          eventSlug,
          status: next,
          profileId,
        })
      );
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await attemptAction(() =>
        leaveOrganizerTrackedEvent({
          competitionId,
          eventSlug,
          profileId: rsvpProfileId ?? profileId,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus("not_registered");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const errorLine = error ? (
    <p className="mt-2 text-xs font-medium text-brand-red" role="alert">
      {error}
    </p>
  ) : null;

  if (status === "registered") {
    const body = (
      <>
        {!embedded ? (
          <>
            <h2
              id="external-registration-status"
              className="text-base font-semibold text-foreground"
            >
              Organizer registration complete
              {forLabel ? ` for ${forLabel}` : ""}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted-strong">
              You marked this complete, so Causey will keep the competition on
              the Plan{whose ? ` ${whose}` : ""}. Causey RSVP is not entry — the
              organizer remains the source of truth for entry and payment.
              Causey cannot cancel organizer entry or issue a refund; open{" "}
              {registrationHost} if you already paid and need to withdraw.
            </p>
          </>
        ) : (
          <p className="max-w-prose text-sm text-muted-strong">
            Marked complete{forLabel ? ` for ${forLabel}` : ""} — Causey keeps
            this on the Plan. The organizer stays the source of truth for entry
            and payment. Causey cannot cancel organizer entry or issue a
            refund; open {registrationHost} if you already paid and need to
            withdraw.
          </p>
        )}
        <div className={`${embedded ? "mt-4" : "mt-3"} flex flex-wrap items-center gap-3`}>
          {signedIn ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void leave()}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/30 hover:text-foreground disabled:opacity-60"
            >
              {pending ? "Saving…" : forLabel ? `Can't go for ${forLabel}` : "Can't go"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("not_registered")}
            className="text-sm font-medium text-muted-strong hover:text-foreground disabled:opacity-60"
          >
            {pending ? "Saving…" : "Undo complete mark"}
          </button>
          <a
            href={registrationHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-red hover:underline"
            aria-label={`Open ${registrationHost} in a new tab${
              forLabel ? ` for ${forLabel}` : ""
            }`}
          >
            Open {registrationHost} <span aria-hidden="true">↗</span>
          </a>
        </div>
        {errorLine}
      </>
    );
    if (embedded) return <div className="mt-4">{body}</div>;
    return (
      <section
        className="mt-6 rounded-xl border border-brand-red/25 bg-accent-soft p-4"
        aria-labelledby="external-registration-status"
        aria-live="polite"
      >
        {body}
      </section>
    );
  }

  if (signedIn && status === "opened") {
    const body = (
      <>
        {!embedded ? (
          <>
            <h2
              id="external-registration-question"
              className="text-base font-semibold text-foreground"
            >
              Is organizer registration complete
              {forLabel ? ` for ${forLabel}` : ""}?
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              Causey cannot see the organizer&rsquo;s checkout. Confirm here
              after registration and payment are finished
              {whose ? ` ${whose}` : ""}. Answering Going on Causey does not
              register {subject} with the organizer.
            </p>
          </>
        ) : (
          <p className="max-w-prose text-sm text-muted">
            Causey can&rsquo;t see the organizer&rsquo;s checkout, so confirm
            here once registration and payment are finished
            {whose ? ` ${whose}` : ""}.
          </p>
        )}
        <div className={`${embedded ? "mt-4" : "mt-4"} flex flex-wrap items-center gap-3`}>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("registered")}
            className="cta-enabled disabled:opacity-60"
          >
            {pending ? "Saving…" : "Yes, registration is complete"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond("not_registered")}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/30 hover:text-foreground disabled:opacity-60"
          >
            Still need to register
          </button>
          <a
            href={registrationHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-strong hover:text-brand-red"
            aria-label={`Open ${registrationHost} in a new tab${
              forLabel ? ` for ${forLabel}` : ""
            }`}
          >
            Open registration site again <span aria-hidden="true">↗</span>
          </a>
        </div>
        {errorLine}
      </>
    );
    if (embedded) return <div className="mt-4">{body}</div>;
    return (
      <section
        className="mt-6 rounded-xl border border-line bg-surface p-4"
        aria-labelledby="external-registration-question"
        aria-live="polite"
      >
        {body}
      </section>
    );
  }

  const defaultBody = (
    <>
      <a
        href={registrationHref}
        target="_blank"
        rel="noopener noreferrer"
        className="cta-enabled inline-flex"
        aria-label={`Register on ${registrationHost}${
          forLabel ? ` for ${forLabel}` : ""
        }; opens in a new tab`}
      >
        {status === "not_registered"
          ? forLabel
            ? `Finish organizer registration for ${forLabel}`
            : "Finish organizer registration"
          : forLabel
            ? `Register ${forLabel} on organizer site`
            : "Register on organizer site"}{" "}
        <span aria-hidden="true">↗</span>
      </a>
      <p className="mt-2 max-w-prose text-2xs text-muted">
        {!embedded
          ? "Registration and payment happen on the organizer’s site, never on Causey. Causey RSVP only tells the club who is coming. "
          : ""}
        {!signedIn ? (
          <>
            {" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/event/${eventSlug}`)}`}
              className="font-semibold text-brand-red hover:underline"
            >
              Sign in first
            </Link>{" "}
            if you want Causey to remember this competition.
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
              Already finished? Mark registration complete
            </button>
          </>
        ) : null}
      </p>
      {errorLine}
    </>
  );

  if (embedded) return <div className="mt-4">{defaultBody}</div>;
  return <div className="mt-6">{defaultBody}</div>;
}
