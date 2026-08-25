"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inviteEntrants, inviteGroup, removeEntrant } from "@/lib/actions/entrants";
import {
  markEntrantAttendance,
  recordEntrantResult,
} from "@/lib/actions/district";
import { formatRecordedResult } from "@/lib/format";

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

  const invitableGroups = groups.filter((group) => group.memberCount > 0);

  return (
    <div className="flex flex-col gap-5">
      {invitableGroups.length ? (
        <div>
          <h3 className="text-xs font-semibold text-muted-strong">Invite a group</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {invitableGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                disabled={isPending}
                onClick={() => onInviteGroup(group)}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30 disabled:opacity-60"
              >
                {group.name} ({group.memberCount})
              </button>
            ))}
          </div>
        </div>
      ) : groups.length ? (
        <p className="text-sm text-muted">
          Your groups have no students yet.{" "}
          <Link
            href={rosterHref}
            className="font-semibold text-brand-red hover:underline"
          >
            Open the roster
          </Link>{" "}
          to add students to a group.
        </p>
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
                No active students to invite yet. Share a join link on your
                roster, then return here.
              </p>
              <Link
                href={rosterHref}
                className="mt-3 inline-flex text-sm font-semibold text-brand-red hover:underline"
              >
                Open roster
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="mt-2 grid gap-2">
              {candidates.map((candidate) => (
                <label
                  key={candidate.profile_id}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm text-foreground sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand-red)]"
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
              className="cta-enabled mt-3 w-full justify-center sm:w-auto disabled:opacity-60"
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onRemove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeEntrant(competitionId, eventSlug, profileId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setConfirming(false);
        router.refresh();
      } catch {
        setError("Could not remove this entrant. Check your connection and try again.");
      }
    });
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <button
          type="button"
          onClick={onRemove}
          disabled={isPending}
          className="min-h-10 font-semibold text-brand-red hover:underline disabled:opacity-60"
        >
          {isPending ? "Removing…" : `Remove ${displayName}`}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-10 text-muted-strong hover:text-foreground"
        >
          Cancel
        </button>
        {error ? (
          <span className="basis-full font-medium text-brand-red" role="alert">
            {error} {displayName} is still on this event.
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="min-h-10 text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
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
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => mark("attended")}
          disabled={isPending}
          className={
            status === "attended"
              ? "min-h-10 rounded-md border border-brand-red/25 bg-accent-soft px-3 py-1.5 text-sm font-semibold text-brand-red"
              : "min-h-10 px-1 text-sm font-semibold text-muted-strong hover:text-brand-red"
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
              ? "min-h-10 rounded-md border border-line bg-surface-soft px-3 py-1.5 text-sm font-semibold text-foreground"
              : "min-h-10 px-1 text-sm font-semibold text-muted-strong hover:text-brand-red"
          }
        >
          Did not attend
        </button>
      </div>
      {error ? (
        <span className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

type ResultSection = { id: string; name: string };

export function ResultForm({
  competitionId,
  eventSlug,
  profileId,
  sections,
  sectionId,
  placement,
  awardLabel,
}: {
  competitionId: string;
  eventSlug: string;
  profileId: string;
  sections: ResultSection[];
  sectionId: string | null;
  placement: number | null;
  awardLabel: string | null;
}) {
  const router = useRouter();
  const [division, setDivision] = useState(sectionId ?? "");
  const [place, setPlace] = useState(placement ? String(placement) : "");
  const [award, setAward] = useState(awardLabel ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const recorded = formatRecordedResult({
    placement,
    awardLabel,
    sectionName: sections.find((section) => section.id === sectionId)?.name ?? null,
  });

  function save() {
    setError(null);
    const parsedPlace = place.trim() ? Number(place.trim()) : null;
    if (place.trim() && (!Number.isInteger(parsedPlace) || (parsedPlace ?? 0) < 1)) {
      setError("Place must be a whole number starting at 1.");
      return;
    }
    startTransition(async () => {
      const result = await recordEntrantResult({
        competitionId,
        eventSlug,
        profileId,
        sectionId: division || null,
        placement: parsedPlace,
        awardLabel: award.trim() ? award.trim() : null,
      });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function clearResult() {
    setError(null);
    setDivision("");
    setPlace("");
    setAward("");
    startTransition(async () => {
      const result = await recordEntrantResult({
        competitionId,
        eventSlug,
        profileId,
        sectionId: null,
        placement: null,
        awardLabel: null,
      });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:items-end">
      {recorded ? (
        <p className="text-xs text-muted">{recorded}</p>
      ) : (
        <p className="text-xs text-muted">Result not recorded</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        {sections.length ? (
          <label className="flex min-w-32 flex-col gap-1">
            <span className="text-2xs font-semibold text-muted-strong">
              Division
            </span>
            <select
              className="field"
              value={division}
              disabled={isPending}
              onChange={(event) => setDivision(event.target.value)}
            >
              <option value="">Not set</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex w-20 flex-col gap-1">
          <span className="text-2xs font-semibold text-muted-strong">Place</span>
          <input
            className="field"
            inputMode="numeric"
            value={place}
            disabled={isPending}
            placeholder="2"
            onChange={(event) => setPlace(event.target.value)}
          />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1">
          <span className="text-2xs font-semibold text-muted-strong">Award</span>
          <input
            className="field"
            value={award}
            disabled={isPending}
            maxLength={80}
            placeholder="Broke to elims"
            onChange={(event) => setAward(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="cta-enabled min-h-10 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Record a result"}
        </button>
        {recorded ? (
          <button
            type="button"
            onClick={clearResult}
            disabled={isPending}
            className="min-h-10 text-sm font-medium text-muted-strong hover:text-brand-red disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? (
        <span className="text-xs font-medium text-brand-red" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
