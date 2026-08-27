"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setOrgAttendance } from "@/lib/actions/attendance";
import type { CoachOrgAttendance } from "@/lib/data/portal";

const orgTypeLabel: Record<CoachOrgAttendance["org"]["type"], string> = {
  club: "Club",
  team: "Team",
  school: "School",
};

/**
 * Event-page panel for coaches: mark one of your orgs as attending this
 * public event, then invite your roster to it.
 */
export function OrgAttendancePanel({
  competitionId,
  eventSlug,
  orgs,
}: {
  competitionId: string;
  eventSlug: string;
  orgs: CoachOrgAttendance[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const attendingOrgs = orgs.filter((entry) => entry.attending);
  const availableOrgs = orgs.filter((entry) => !entry.attending);
  const [selectedOrgId, setSelectedOrgId] = useState(
    availableOrgs[0]?.org.id ?? ""
  );
  const selectedOrg =
    availableOrgs.find((entry) => entry.org.id === selectedOrgId) ??
    availableOrgs[0];

  async function toggle(entry: CoachOrgAttendance) {
    setError(null);
    setPendingOrgId(entry.org.id);
    try {
      const result = await setOrgAttendance({
        orgId: entry.org.id,
        orgSlug: entry.org.slug,
        competitionId,
        eventSlug,
        attending: !entry.attending,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update this event. Check your connection and try again.");
    } finally {
      setPendingOrgId(null);
    }
  }

  return (
    <div className="border-b border-line pb-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
        Bring your roster
      </h2>
      <p className="mt-1 text-xs text-muted">
        Add this event to a club, team, or school calendar, then invite its
        students to RSVP.
      </p>

      {attendingOrgs.length ? (
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
            Going
          </p>
          <ul className="mt-1">
            {attendingOrgs.map((entry) => (
              <li
                key={entry.org.id}
                className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {entry.org.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {orgTypeLabel[entry.org.type]} calendar
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pendingOrgId !== null}
                  onClick={() => toggle(entry)}
                  className="shrink-0 text-sm font-medium text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
                >
                  {pendingOrgId === entry.org.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
          <Link
            href={`/event/${eventSlug}/manage`}
            className="mt-1 inline-flex text-sm font-semibold text-brand-red hover:underline"
          >
            Invite {attendingOrgs.length === 1 ? "roster" : "rosters"} &amp;
            track RSVPs
          </Link>
        </div>
      ) : null}

      {selectedOrg ? (
        <div
          className={
            attendingOrgs.length ? "mt-4 border-t border-line pt-4" : "mt-3"
          }
        >
          {availableOrgs.length > 1 ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-strong">
                Choose a roster
              </span>
              <select
                className="field"
                value={selectedOrg.org.id}
                disabled={pendingOrgId !== null}
                onChange={(event) => setSelectedOrgId(event.target.value)}
              >
                {availableOrgs.map((entry) => (
                  <option key={entry.org.id} value={entry.org.id}>
                    {entry.org.name} · {orgTypeLabel[entry.org.type]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selectedOrg.org.name}
              </p>
              <p className="text-xs text-muted">
                {orgTypeLabel[selectedOrg.org.type]} roster
              </p>
            </div>
          )}
          <button
            type="button"
            disabled={pendingOrgId !== null}
            onClick={() => toggle(selectedOrg)}
            className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red disabled:opacity-60"
          >
            {pendingOrgId === selectedOrg.org.id
              ? "Marking as going…"
              : `Mark ${orgTypeLabel[selectedOrg.org.type].toLowerCase()} as going`}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
