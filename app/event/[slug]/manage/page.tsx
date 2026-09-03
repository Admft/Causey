import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AttendanceButtons,
  EntrantManager,
  RemoveEntrantButton,
  ResultForm,
} from "@/components/EntrantManager";
import { EventOrganizerSubnav } from "@/components/EventOrganizerSubnav";
import { EventPulseStrip } from "@/components/EventPulseStrip";
import { PageBackLink } from "@/components/PageBackLink";
import { PortalMission } from "@/components/PortalPrimitives";
import { PublishTournamentPanel } from "@/components/PublishTournamentPanel";
import { isCompetitionStarted } from "@/lib/competition-timing";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompetitionAsViewer,
  getChildSchoolsForDistrict,
  getCoachOrgsWithAttendance,
  getCompetitionBySlugAuthed,
  getEventAttendance,
  getOrgBySlugForViewer,
  getOrgGroups,
  getOrgRoster,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { buildEventPulse } from "@/lib/event-pulse";
import { formatDateRange } from "@/lib/format";
import { manageEventTitle } from "@/lib/portal-copy";
import {
  formatManageReplyMeta,
  groupAttendanceByReplyStatus,
  orderedAttendanceReplySections,
  sortAttendanceBySchool,
  summarizeAttendance,
  type AttendanceReplyBucket,
} from "@/lib/rsvp";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage event",
  description: "Invite your roster, watch RSVPs, and keep attendance in one place.",
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

  let hostOrg: {
    id: string;
    slug: string;
    name: string;
    type: "school" | "district" | "club" | "team";
  } | null = null;
  if (competition.org_id) {
    const supabase = await createServerSupabaseClient();
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id, slug, name, type")
      .eq("id", competition.org_id)
      .maybeSingle();
    if (
      orgRow &&
      (orgRow.type === "school" ||
        orgRow.type === "district" ||
        orgRow.type === "club" ||
        orgRow.type === "team")
    ) {
      hostOrg = {
        id: orgRow.id,
        slug: orgRow.slug,
        name: orgRow.name,
        type: orgRow.type,
      };
    }
  }
  const isDistrictHost = hostOrg?.type === "district";
  const childSchools =
    canManage && isDistrictHost && hostOrg
      ? await getChildSchoolsForDistrict(hostOrg.id)
      : [];

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
  const rosterSources = [
    ...(canManage && hostOrg && !isDistrictHost ? [hostOrg] : []),
    ...childSchools,
    ...attendingOrgs.map((entry) => entry.org),
  ];
  const rosterOrgIds = [...new Set(rosterSources.map((org) => org.id))];
  const orgNameById = new Map(
    rosterSources.map((org) => [org.id, org.name] as const)
  );
  const [rosterLists, groupLists] = await Promise.all([
    Promise.all(rosterOrgIds.map((orgId) => getOrgRoster(orgId))),
    Promise.all(rosterOrgIds.map((orgId) => getOrgGroups(orgId))),
  ]);
  const roster = rosterLists.flatMap((rows, index) => {
    const orgId = rosterOrgIds[index];
    const orgName = orgNameById.get(orgId) ?? null;
    return rows.map((row) => ({ ...row, orgName }));
  });
  const groups = groupLists.flatMap((rows, index) => {
    const orgId = rosterOrgIds[index];
    const orgName = orgNameById.get(orgId);
    return rows.map((group) => ({
      ...group,
      name:
        isDistrictHost && orgName && childSchools.length > 1
          ? `${orgName} · ${group.name}`
          : group.name,
    }));
  });

  const invitedIds = new Set(attendance.map((row) => row.profile_id));
  const seenCandidates = new Set<string>();
  const activeStudents = roster.filter(
    (row) => row.member_status === "active" && row.member_role === "student"
  );
  const travelProfileIds = new Set(
    activeStudents.map((row) => row.profile_id)
  );
  const visibleAttendance = canManage
    ? attendance
    : attendance.filter((row) => travelProfileIds.has(row.profile_id));
  const schoolNameByProfileId = new Map<string, string>();
  if (isDistrictHost) {
    for (const row of visibleAttendance) {
      const originName = row.origin_org_name?.trim();
      if (originName) schoolNameByProfileId.set(row.profile_id, originName);
    }
    for (const row of roster) {
      const schoolName = row.orgName?.trim();
      if (!schoolName || schoolNameByProfileId.has(row.profile_id)) continue;
      schoolNameByProfileId.set(row.profile_id, schoolName);
    }
  }
  const labeledAttendance = visibleAttendance.map((row) => ({
    ...row,
    orgName: isDistrictHost
      ? row.origin_org_name?.trim() ||
        schoolNameByProfileId.get(row.profile_id) ||
        null
      : null,
  }));
  const candidates = activeStudents
    .filter((row) => {
      if (invitedIds.has(row.profile_id)) return false;
      if (seenCandidates.has(row.profile_id)) return false;
      seenCandidates.add(row.profile_id);
      return true;
    })
    .map((row) => ({
      profile_id: row.profile_id,
      display_name: row.display_name,
      orgName: isDistrictHost ? row.orgName : null,
    }));
  const summary = summarizeAttendance(labeledAttendance);
  const today = new Date().toISOString().slice(0, 10);
  const attendanceOpen = isCompetitionStarted(competition, today);
  const isDraft = canManage && competition.status === "draft";
  const needsInvite = !isDraft && !visibleAttendance.length;
  const needsReplies = !isDraft && summary.awaiting > 0;
  const missingResults = labeledAttendance.filter(
    (row) =>
      row.status === "attended" &&
      row.placement == null &&
      !row.award_label &&
      !row.section_id
  ).length;
  const inviteFirst =
    !isDraft &&
    (needsInvite ||
      (candidates.length > 0 && !needsReplies && !attendanceOpen));
  const resultSections = competition.sections.map((section) => ({
    id: section.id,
    name: section.name,
  }));

  // Keep coaches inside the org workspace shell (subnav + roster deep link).
  let orgShell: {
    slug: string;
    name: string;
    orgType: "school" | "district" | "club" | "team";
  } | null = null;
  let moderationNote: string | null = null;
  const preferredOrgId =
    canManage && competition.org_id
      ? competition.org_id
      : (attendingOrgs[0]?.org.id ?? null);
  if (preferredOrgId) {
    const supabase = await createServerSupabaseClient();
    const [{ data: orgRow }, { data: moderation }] = await Promise.all([
      supabase
        .from("organizations")
        .select("slug")
        .eq("id", preferredOrgId)
        .maybeSingle(),
      canManage && competition.status === "rejected"
        ? supabase
            .from("competitions")
            .select("moderation_note")
            .eq("id", competition.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    moderationNote =
      (moderation?.moderation_note as string | null | undefined) ?? null;
    if (orgRow?.slug) {
      const view = await getOrgBySlugForViewer(orgRow.slug, user.id);
      if (view) {
        orgShell = {
          slug: view.org.slug,
          name: view.org.name,
          orgType: view.org.type,
        };
      }
    }
  }
  const rosterHref = isDistrictHost
    ? childSchools[0]
      ? `/orgs/${childSchools[0].slug}/roster#add-students`
      : orgShell
        ? `/orgs/${orgShell.slug}/settings#schools`
        : "/orgs"
    : orgShell
      ? `/orgs/${orgShell.slug}/roster`
      : "/orgs#organizations";
  const workspaceHref = orgShell ? `/orgs/${orgShell.slug}` : "/orgs";
  const workspaceTitle = manageEventTitle(
    canManage ? hostOrg?.type : orgShell?.orgType
  );

  let registrationByUser = new Map<
    string,
    "opened" | "registered" | "not_registered"
  >();
  if (competition.reg_url && labeledAttendance.length) {
    const supabase = await createServerSupabaseClient();
    const { data: registrations } = await supabase
      .from("external_registrations")
      .select("user_id, status")
      .eq("competition_id", competition.id);
    registrationByUser = new Map(
      (registrations ?? []).map((row) => [
        row.user_id as string,
        row.status as "opened" | "registered" | "not_registered",
      ])
    );
  }
  const pulse = buildEventPulse(
    labeledAttendance.map((row) => ({
      ...row,
      registration_status: registrationByUser.get(row.profile_id) ?? null,
    })),
    { hasRegUrl: Boolean(competition.reg_url) }
  );

  let mission: {
    title: string;
    description: string;
    action: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
  if (isDraft) {
    const needsPublicReview = competition.audience === "public";
    mission = {
      title: needsPublicReview
        ? "Submit for review before inviting"
        : "Publish before inviting",
      description: needsPublicReview
        ? "Students only see invitations after submission. Review the audience and send this public listing to platform review below."
        : "Students only see invitations after this member event is published. Review the audience and publish below.",
      action: {
        href: "#publish",
        label: needsPublicReview ? "Review and submit" : "Review and publish",
      },
      secondary: { href: workspaceHref, label: "Back to workspace" },
    };
  } else if (attendanceOpen && missingResults > 0) {
    mission = {
      title: "Record a result",
      description: `${missingResults} ${
        missingResults === 1 ? "student attended" : "students attended"
      } without a place or award yet. Absence here means not recorded, not that they did not place.`,
      action: { href: "#rsvps", label: "Record a result" },
      secondary: { href: workspaceHref, label: "Back to workspace" },
    };
  } else if (attendanceOpen) {
    mission = {
      title: "Mark who attended",
      description: `${summary.going} ${
        summary.going === 1 ? "student was" : "students were"
      } marked going. Record attendance, then a place or award if you have one.`,
      action: { href: "#rsvps", label: "Review attendance" },
      secondary: { href: workspaceHref, label: "Back to workspace" },
    };
  } else if (needsInvite) {
    mission = isDistrictHost
      ? {
          title: activeStudents.length
            ? "Invite connected schools"
            : childSchools.length
              ? "Add students at a school, then invite"
              : "Add a school, then invite",
          description: activeStudents.length
            ? "This district event has no district student roster. Invite every connected school at once, or pick students and groups below."
            : childSchools.length
              ? "Connected schools have no students on roster yet. Share a school join link, then come back to invite."
              : "Create a school workspace, provision students, then invite them to this district event.",
          action: activeStudents.length
            ? { href: "#invite", label: "Invite students" }
            : {
                href: rosterHref,
                label: childSchools.length
                  ? "Open a school roster"
                  : "Add a school",
              },
          secondary: activeStudents.length
            ? {
                href: rosterHref,
                label: "Open a school roster",
              }
            : { href: workspaceHref, label: "Back to workspace" },
        }
      : {
          title: activeStudents.length
            ? "Invite students or a group"
            : "Add students, then invite",
          description: activeStudents.length
            ? "Nobody is invited yet. Invite a group in one tap, or pick students from your roster."
            : "Your roster has no active students. Share a join link, then come back to invite them.",
          action: activeStudents.length
            ? { href: "#invite", label: "Invite students" }
            : { href: rosterHref, label: "Open roster" },
          secondary: activeStudents.length
            ? { href: rosterHref, label: "Open roster" }
            : { href: workspaceHref, label: "Back to workspace" },
        };
  } else if (needsReplies) {
    mission = {
      title: `${summary.awaiting} ${
        summary.awaiting === 1 ? "reply is" : "replies are"
      } still open`,
      description: isDistrictHost
        ? `${summary.going} going · ${summary.notGoing} can’t go. Replies name each school so you can follow up without leaving this page.`
        : `${summary.going} going · ${summary.notGoing} can’t go. Follow up, or invite more students if the roster grew.`,
      action: { href: "#rsvps", label: "Review replies" },
      secondary:
        candidates.length > 0
          ? { href: "#invite", label: "Invite more" }
          : { href: workspaceHref, label: "Back to workspace" },
    };
  } else {
    mission = {
      title: "Invites are in",
      description: `${summary.going} going · ${summary.notGoing} can’t go. Invite more if needed, or return to your workspace.`,
      action: { href: workspaceHref, label: "Back to workspace" },
      secondary:
        candidates.length > 0
          ? { href: "#invite", label: "Invite more" }
          : undefined,
    };
  }

  const inviteSection = (
    <section id="invite" className="section-rule mt-10 scroll-mt-24 pt-8">
      <h2 className="text-sm font-semibold text-foreground">Invite</h2>
      <p className="mt-1 text-sm text-muted">
        {isDistrictHost
          ? "Invite students from connected schools. Groups stay with the school that created them."
          : "Groups invite in one step. Individual picks work when you only need a few students."}
      </p>
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
          rosterLinkLabel={
            isDistrictHost
              ? childSchools.length
                ? "Open a school roster"
                : "Add a school"
              : "Open the roster"
          }
          inviteAllConnected={
            isDistrictHost && canManage && candidates.length
              ? {
                  studentCount: candidates.length,
                  schoolCount: childSchools.length,
                }
              : null
          }
          isDistrictHosted={isDistrictHost}
        />
      </div>
    </section>
  );

  const replyBuckets = groupAttendanceByReplyStatus(labeledAttendance);
  const replySectionOrder = orderedAttendanceReplySections({
    isPast: attendanceOpen,
    needsReplies,
  });
  const replySectionCopy: Record<AttendanceReplyBucket, string> = attendanceOpen
    ? {
        awaiting: "Still awaiting a reply",
        going: "Going / attendance",
        notGoing: "Can’t go / did not attend",
      }
    : {
        awaiting: "Needs a reply",
        going: "Going",
        notGoing: "Can’t go",
      };
  const hasRegUrl = Boolean(competition.reg_url);

  const rsvpSection = (
    <section id="rsvps" className="section-rule mt-10 scroll-mt-24 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {attendanceOpen ? "Attendance" : "Replies"}
        </h2>
        <p className="text-xs text-muted">
          <span className="font-semibold text-foreground">
            {summary.going} going
          </span>
          {" · "}
          {summary.notGoing} can&rsquo;t go · {summary.awaiting} awaiting
        </p>
      </div>
      {isDistrictHost && labeledAttendance.length ? (
        <p className="mt-2 text-xs text-muted">
          Each reply names the connected school so multi-school follow-up stays
          on this page.
        </p>
      ) : null}
      {!labeledAttendance.length ? (
        <p className="mt-3 text-sm text-muted">
          Nobody is invited yet — invite students or a group
          {inviteFirst ? " above" : " below"}.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {replySectionOrder.map((bucket) => {
            const rows = isDistrictHost
              ? sortAttendanceBySchool(replyBuckets[bucket])
              : replyBuckets[bucket];
            if (!rows.length) return null;
            return (
              <div key={bucket}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold text-muted-strong">
                    {replySectionCopy[bucket]}
                  </h3>
                  <p className="text-xs text-muted">
                    {rows.length}{" "}
                    {rows.length === 1 ? "student" : "students"}
                  </p>
                </div>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {rows.map((row) => (
                    <li
                      key={row.profile_id}
                      className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                        row.member_status !== "active" ? "opacity-60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {row.display_name || "Unnamed student"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatManageReplyMeta({
                            status: row.status,
                            orgName: row.orgName,
                            memberStatus: row.member_status,
                            hasRegUrl,
                            registrationStatus: registrationByUser.get(
                              row.profile_id
                            ),
                          })}
                        </p>
                      </div>
                      <div className="sm:shrink-0">
                        {attendanceOpen ? (
                          <div className="flex flex-col items-stretch gap-2 sm:items-end">
                            <AttendanceButtons
                              competitionId={competition.id}
                              eventSlug={competition.slug}
                              profileId={row.profile_id}
                              status={row.status}
                            />
                            {row.status === "attended" ? (
                              <ResultForm
                                competitionId={competition.id}
                                eventSlug={competition.slug}
                                profileId={row.profile_id}
                                sections={resultSections}
                                sectionId={row.section_id}
                                placement={row.placement}
                                awardLabel={row.award_label}
                              />
                            ) : null}
                          </div>
                        ) : (
                          <RemoveEntrantButton
                            competitionId={competition.id}
                            eventSlug={competition.slug}
                            profileId={row.profile_id}
                            displayName={row.display_name || "this student"}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <>
      <EventOrganizerSubnav
        slug={competition.slug}
        tab="people"
        canEditListing={canManage}
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {orgShell ? (
            <PageBackLink href={`/orgs/${orgShell.slug}`}>
              {orgShell.name}
            </PageBackLink>
          ) : (
            <PageBackLink href={`/event/${competition.slug}`}>
              Event page
            </PageBackLink>
          )}
          {orgShell ? (
            <Link
              href={`/event/${competition.slug}`}
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Event page
            </Link>
          ) : null}
        </div>
        <p className="mt-6 text-sm font-semibold text-brand-red">
          {workspaceTitle}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {competition.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {formatDateRange(competition.start_date, competition.end_date)}
          {competition.status === "pending_review"
            ? " · awaiting platform review"
            : competition.status === "rejected"
              ? " · returned for changes"
              : competition.visibility === "private"
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

        {isDraft ? (
          <div id="publish" className="mt-8 scroll-mt-24">
            <PublishTournamentPanel
              competitionId={competition.id}
              eventSlug={competition.slug}
              audience={competition.audience}
              orgSlug={orgShell?.slug}
            />
          </div>
        ) : null}

        {canManage && competition.status === "rejected" ? (
          <section className="mt-8 rounded-2xl border border-brand-red/30 bg-accent-soft p-5">
            <h2 className="text-base font-semibold text-foreground">
              Changes requested before this can be public
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted-strong">
              {moderationNote ||
                "Review the competition details, correct the listing, and resubmit it."}
            </p>
            <Link
              href={`/event/${competition.slug}/edit`}
              className="mt-3 inline-block text-sm font-semibold text-brand-red hover:underline"
            >
              Fix and resubmit
            </Link>
          </section>
        ) : null}

        <div className="mt-8">
          <PortalMission
            title={mission.title}
            description={mission.description}
            action={mission.action}
            secondary={mission.secondary}
          />
        </div>

        {!isDraft ? (
          <div className="mt-8">
            <EventPulseStrip
              pulse={pulse}
              isPast={attendanceOpen}
              hasRegUrl={Boolean(competition.reg_url)}
            />
          </div>
        ) : null}

        {isDraft ? null : inviteFirst ? (
          <>
            {inviteSection}
            {rsvpSection}
          </>
        ) : (
          <>
            {rsvpSection}
            {inviteSection}
          </>
        )}
      </div>
    </>
  );
}
