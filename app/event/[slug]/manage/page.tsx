import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EntrantManager, RemoveEntrantButton } from "@/components/EntrantManager";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompetitionAsViewer,
  getCoachOrgsWithAttendance,
  getCompetitionBySlugAuthed,
  getEventAttendance,
  getOrgGroups,
  getOrgRoster,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { formatDateRange } from "@/lib/format";
import { rsvpLabel, summarizeAttendance } from "@/lib/rsvp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage entrants",
  description: "Invite your roster and track RSVPs for this tournament.",
};

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) redirect(`/event/${slug}`);
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/event/${slug}/manage`);

  const competition = await getCompetitionBySlugAuthed(slug);
  if (!competition) notFound();
  const canManage = await canManageCompetitionAsViewer(competition, user.id);
  // Coaches whose org "attends" this public event can also invite their roster.
  const attendingOrgs =
    competition.visibility === "public"
      ? (
          await getCoachOrgsWithAttendance(
            user.id,
            competition.id,
            competition.org_id
          )
        ).filter((entry) => entry.attending)
      : [];
  if (!canManage && !attendingOrgs.length) redirect(`/event/${slug}`);

  const attendance = await getEventAttendance(competition.id);
  const rosterOrgIds = [
    ...(canManage && competition.org_id ? [competition.org_id] : []),
    ...attendingOrgs.map((entry) => entry.org.id),
  ];
  const [rosterLists, groupLists] = await Promise.all([
    Promise.all(rosterOrgIds.map((orgId) => getOrgRoster(orgId))),
    Promise.all(rosterOrgIds.map((orgId) => getOrgGroups(orgId))),
  ]);
  const roster = rosterLists.flat();
  const groups = groupLists.flat();

  const invitedIds = new Set(attendance.map((row) => row.profile_id));
  const seenCandidates = new Set<string>();
  const candidates = roster
    .filter((row) => {
      if (row.member_status !== "active" || invitedIds.has(row.profile_id)) {
        return false;
      }
      if (seenCandidates.has(row.profile_id)) return false;
      seenCandidates.add(row.profile_id);
      return true;
    })
    .map((row) => ({ profile_id: row.profile_id, display_name: row.display_name }));
  const summary = summarizeAttendance(attendance);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href={`/event/${competition.slug}`}
        className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        ← Back to event page
      </Link>
      <p className="mt-6 text-sm font-semibold text-brand-red">Hosting</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {competition.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {formatDateRange(competition.start_date, competition.end_date)}
        {competition.visibility === "private"
          ? " · private to your organization"
          : " · listed publicly"}
      </p>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">RSVPs</h2>
        <p className="mt-2 text-sm text-muted-strong">
          <span className="font-semibold text-foreground">{summary.going} going</span>
          {" · "}
          {summary.notGoing} can&rsquo;t go · {summary.awaiting} awaiting reply
        </p>
        {!attendance.length ? (
          <p className="mt-3 text-sm text-muted">
            Nobody is invited yet — invite students or a group below.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {attendance.map((row) => (
              <li
                key={row.profile_id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 ${
                  row.member_status !== "active" ? "opacity-60" : ""
                }`}
              >
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {row.display_name || "Unnamed student"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {rsvpLabel(row.status)}
                    {row.member_status !== "active" ? " · no longer on roster" : ""}
                  </span>
                </div>
                <RemoveEntrantButton
                  competitionId={competition.id}
                  eventSlug={competition.slug}
                  profileId={row.profile_id}
                  displayName={row.display_name || "this student"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Invite</h2>
        <div className="mt-4">
          <EntrantManager
            competitionId={competition.id}
            eventSlug={competition.slug}
            candidates={candidates}
            groups={groups.map((g) => ({
              id: g.id,
              name: g.name,
              memberCount: g.member_ids.length,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
