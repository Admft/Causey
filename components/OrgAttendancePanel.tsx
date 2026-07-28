"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrgAttendance } from "@/lib/actions/attendance";
import type { CoachOrgAttendance } from "@/lib/data/portal";

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
  const [isPending, startTransition] = useTransition();

  function toggle(org: CoachOrgAttendance) {
    setError(null);
    startTransition(async () => {
      const result = await setOrgAttendance({
        orgId: org.org.id,
        orgSlug: org.org.slug,
        competitionId,
        eventSlug,
        attending: !org.attending,
      });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold text-foreground">Take your organization</h2>
      <p className="mt-1 text-xs text-muted">
        Mark it as attending so your roster sees this event, then invite them
        to RSVP.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {orgs.map((entry) => (
          <li key={entry.org.id} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-strong">
              {entry.org.name}
            </span>
            {entry.attending ? (
              <span className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/event/${eventSlug}/manage`}
                  className="text-sm font-semibold text-brand-red hover:underline"
                >
                  Invite &amp; track RSVPs
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggle(entry)}
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
                >
                  Not going after all
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => toggle(entry)}
                className="self-start rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30 disabled:opacity-60"
              >
                Mark as attending
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-2 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
