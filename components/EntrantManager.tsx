"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inviteEntrants, inviteGroup, removeEntrant } from "@/lib/actions/entrants";
import { markEntrantAttendance } from "@/lib/actions/district";

type Candidate = { profile_id: string; display_name: string };
type GroupOption = { id: string; name: string; memberCount: number };

/** Coach tool on /event/[slug]/manage: invite students or whole groups. */
export function EntrantManager({
  competitionId,
  eventSlug,
  candidates,
  groups,
  hasActiveRoster,
  rosterHref = "/orgs#organizations",
}: {
  competitionId: string;
  eventSlug: string;
  candidates: Candidate[];
  groups: GroupOption[];
  hasActiveRoster: boolean;
  /** Prefer this org's roster when invites have nobody to pick. */
  rosterHref?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function onInviteGroup(group: GroupOption) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await inviteGroup(competitionId, eventSlug, group.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setMessage(
          result.invited
            ? `Invited ${result.invited} ${
                result.invited === 1 ? "student" : "students"
              } from ${group.name}.`
            : `Everyone in ${group.name} was already invited.`
        );
      }
      router.refresh();
    });
  }

  function onInviteSelected() {
    if (!selected.size) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await inviteEntrants(competitionId, eventSlug, [...selected]);
      if (!result.ok) {
        setError(result.error);
      } else {
        setMessage(
          result.invited
            ? `Invited ${result.invited} ${
                result.invited === 1 ? "student" : "students"
              }.`
            : "Those students were already invited."
        );
        setSelected(new Set());
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.length ? (
        <div>
          <h3 className="text-xs font-semibold text-muted-strong">Invite a group</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                disabled={isPending || !group.memberCount}
                onClick={() => onInviteGroup(group)}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30 disabled:opacity-60"
              >
                {group.name} ({group.memberCount})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold text-muted-strong">Invite students</h3>
        {!candidates.length ? (
          hasActiveRoster ? (
            <p className="mt-2 text-sm text-muted">
              Everyone on your active roster is already invited.{" "}
              <a
                href="#rsvps"
                className="font-semibold text-brand-red hover:underline"
              >
                Review replies
              </a>
            </p>
          ) : (
            <div className="mt-2">
              <p className="max-w-prose text-sm text-muted">
                No active students are available to invite. Add students to an
                organization roster, then return to this event.
              </p>
              <Link
                href={rosterHref}
                className="mt-3 inline-flex text-sm font-semibold text-brand-red hover:underline"
              >
                Open organization roster
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {candidates.map((candidate) => (
                <label
                  key={candidate.profile_id}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    disabled={isPending}
                    checked={selected.has(candidate.profile_id)}
                    onChange={() => toggle(candidate.profile_id)}
                  />
                  {candidate.display_name || "Unnamed student"}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={isPending || !selected.size}
              onClick={onInviteSelected}
              className="cta-enabled mt-3 disabled:opacity-60"
            >
              {isPending
                ? "Inviting…"
                : `Invite ${selected.size || "selected"} ${selected.size === 1 ? "student" : "students"}`}
            </button>
          </>
        )}
      </div>

      {message ? (
        <div
          className="rounded-xl border border-accent/25 bg-accent-soft p-4"
          role="status"
        >
          <p className="text-sm font-medium text-foreground">{message}</p>
          <a
            href="#rsvps"
            className="mt-2 inline-flex text-sm font-semibold text-brand-red hover:underline"
          >
            Review replies
          </a>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveEntrantButton({
  competitionId,
  eventSlug,
  profileId,
  displayName,
}: {
  competitionId: string;
  eventSlug: string;
  profileId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onRemove() {
    startTransition(async () => {
      await removeEntrant(competitionId, eventSlug, profileId);
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onRemove}
          disabled={isPending}
          className="font-semibold text-brand-red hover:underline disabled:opacity-60"
        >
          {isPending ? "Removing…" : `Remove ${displayName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted-strong hover:text-foreground"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
    >
      Remove
    </button>
  );
}

export function AttendanceButtons({
  competitionId,
  eventSlug,
  profileId,
  status,
}: {
  competitionId: string;
  eventSlug: string;
  profileId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark(nextStatus: "attended" | "did_not_attend") {
    setError(null);
    startTransition(async () => {
      const result = await markEntrantAttendance({
        competitionId,
        eventSlug,
        profileId,
        status: nextStatus,
      });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => mark("attended")}
          disabled={isPending}
          className={
            status === "attended"
              ? "rounded-md border border-brand-red/25 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-brand-red"
              : "text-xs font-semibold text-muted-strong hover:text-brand-red"
          }
        >
          Attended
        </button>
        <button
          type="button"
          onClick={() => mark("did_not_attend")}
          disabled={isPending}
          className={
            status === "did_not_attend"
              ? "rounded-md border border-line bg-surface-soft px-2.5 py-1 text-xs font-semibold text-foreground"
              : "text-xs font-semibold text-muted-strong hover:text-brand-red"
          }
        >
          Did not attend
        </button>
      </div>
      {error ? (
        <span className="text-xs font-medium text-brand-red">{error}</span>
      ) : null}
    </div>
  );
}
