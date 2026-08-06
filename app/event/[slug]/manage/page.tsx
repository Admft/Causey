import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AttendanceButtons,
  EntrantManager,
  RemoveEntrantButton,
} from "@/components/EntrantManager";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PublishTournamentPanel } from "@/components/PublishTournamentPanel";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompetitionAsViewer,
  getCoachOrgsWithAttendance,
  getCompetitionBySlugAuthed,
  getEventAttendance,
  getOrgBySlugForViewer,
  getOrgGroups,
  getOrgRoster,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { formatDateRange } from "@/lib/format";
import { rsvpLabel, summarizeAttendance } from "@/lib/rsvp";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const activeStudents = roster.filter(
    (row) => row.member_status === "active" && row.member_role === "student"
  );
  const candidates = activeStudents
    .filter((row) => {
      if (invitedIds.has(row.profile_id)) return false;
      if (seenCandidates.has(row.profile_id)) return false;
      seenCandidates.add(row.profile_id);
      return true;
    })
    .map((row) => ({ profile_id: row.profile_id, display_name: row.display_name }));
  const summary = summarizeAttendance(attendance);
  const isPast =
    (competition.end_date ?? competition.start_date) <
    new Date().toISOString().slice(0, 10);

  // Keep coaches inside the org workspace shell (subnav + roster deep link).
  let orgShell: {
    slug: string;
    name: string;
    showRoster: boolean;
    showAdmin: boolean;
  } | null = null;
  const preferredOrgId =
    canManage && competition.org_id
      ? competition.org_id
      : (attendingOrgs[0]?.org.id ?? null);
  if (preferredOrgId) {
    const supabase = await createServerSupabaseClient();
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", preferredOrgId)
      .maybeSingle();
    if (orgRow?.slug) {
      const view = await getOrgBySlugForViewer(orgRow.slug, user.id);
      if (view) {
        orgShell = {
          slug: view.org.slug,
          name: view.org.name,
          showRoster: view.isCoach,
          showAdmin: view.isAdmin,
        };
      }
    }
  }
  const rosterHref = orgShell
    ? `/orgs/${orgShell.slug}/roster`
    : "/orgs#organizations";

  return (
    <>
      {orgShell ? (
        <OrgSubnavBar
          slug={orgShell.slug}
          orgName={orgShell.name}
          tab="overview"
          showRoster={orgShell.showRoster}
          showAdmin={orgShell.showAdmin}
        />
      ) : null}
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          {orgShell ? (
            <Link
              href={`/orgs/${orgShell.slug}`}
              className="text-muted-strong transition-colors hover:text-brand-red"
            >
              ← Back to {orgShell.name}
            </Link>
          ) : null}
          <Link
            href={`/event/${competition.slug}`}
            className="text-muted-strong transition-colors hover:text-brand-red"
          >
            {orgShell ? "Event page" : "← Back to event page"}
          </Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-brand-red">Hosting</p>
        {canManage && competition.status === "draft" ? (
          <div className="mt-4">
            <PublishTournamentPanel
              competitionId={competition.id}
              eventSlug={competition.slug}
              visibility={
                competition.visibility === "private" ? "private" : "public"
              }
            />
          </div>
        ) : null}
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {competition.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {formatDateRange(competition.start_date, competition.end_date)}
          {competition.visibility === "private"
            ? " · private to your organization"
            : " · listed publicly"}
          {canManage ? (
            <>
              {" · "}
              <Link
                href={`/event/${competition.slug}/edit`}
                className="font-semibold text-brand-red hover:underline"
              >
                Edit details
              </Link>
            </>
          ) : null}
        </p>

        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">RSVPs</h2>
          <p className="mt-2 text-sm text-muted-strong">
            <span className="font-semibold text-foreground">
              {summary.going} going
            </span>
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
                      {row.member_status !== "active"
                        ? " · no longer on roster"
                        : ""}
                    </span>
                  </div>
                  {isPast ? (
                    <AttendanceButtons
                      competitionId={competition.id}
                      eventSlug={competition.slug}
                      profileId={row.profile_id}
                      status={row.status}
                    />
                  ) : (
                    <RemoveEntrantButton
                      competitionId={competition.id}
                      eventSlug={competition.slug}
                      profileId={row.profile_id}
                      displayName={row.display_name || "this student"}
                    />
                  )}
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
              hasActiveRoster={activeStudents.length > 0}
              rosterHref={rosterHref}
            />
          </div>
        </section>
      </div>
    </>
  );
}
