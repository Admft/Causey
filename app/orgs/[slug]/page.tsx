import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/AnnouncementForm";
import { LeaveOrgButton } from "@/components/LeaveOrgButton";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalListRow,
  PortalMission,
} from "@/components/PortalPrimitives";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getSessionUser } from "@/lib/auth/session";
import { competitionTypeLabel } from "@/lib/competition-types";
import { getDistrictPilotReadiness } from "@/lib/data/district";
import {
  getMyEntrantRows,
  getOrgAttendedEvents,
  getOrgBySlugForViewer,
  getOrgCompetitionWorkspace,
  getOrgRoster,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import {
  getDistrictReadinessAction,
  getDistrictSchoolReadinessStatus,
} from "@/lib/district-readiness";
import { formatDateRange, formatFeeCents } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization",
  description: "Roster, join code, and competitions for this organization.",
};

const ORG_TYPE_LABEL: Record<string, string> = {
  school: "School account",
  club: "Club",
  team: "Team",
  district: "District account",
};

const ADMIN_WORKSPACE_LABEL: Record<string, string> = {
  school: "school administration",
  district: "district administration",
  club: "club administration",
  team: "team administration",
};

function formatSavedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function coachEventAction(event: {
  slug: string;
  status: string;
}): { href: string; label: string } {
  if (event.status === "rejected") {
    return { href: `/event/${event.slug}/edit`, label: "Fix and resubmit" };
  }
  if (event.status === "draft") {
    return {
      href: `/event/${event.slug}/manage`,
      label: "Review audience and continue",
    };
  }
  if (event.status === "pending_review") {
    return {
      href: `/event/${event.slug}/manage`,
      label: "View while in review",
    };
  }
  return { href: `/event/${event.slug}/manage`, label: "Manage invites" };
}

export default async function OrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { slug } = await params;
  const { submitted } = await searchParams;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  const {
    org,
    membership,
    isCoach,
    canManageTournaments,
    isAdmin,
    isDistrictAdmin,
    activeMemberCount,
    events: directEvents,
    drafts: directDrafts,
    announcements,
  } = view;

  const [
    entrantRows,
    attendedEvents,
    roster,
    districtReadinessResult,
    competitionWorkspace,
  ] =
    await Promise.all([
    isCoach ? Promise.resolve([]) : getMyEntrantRows(user.id),
    getOrgAttendedEvents(org.id),
    isCoach && org.type !== "district"
      ? getOrgRoster(org.id)
      : Promise.resolve([]),
    isDistrictAdmin
      ? getDistrictPilotReadiness(org.id)
      : Promise.resolve(null),
    org.type === "district"
      ? getOrgCompetitionWorkspace(org)
      : Promise.resolve(null),
  ]);
  const events = competitionWorkspace?.events ?? directEvents;
  const drafts = competitionWorkspace?.drafts ?? directDrafts;
  const myRsvpByCompetition = new Map(
    entrantRows.map((row) => [row.competition_id, row])
  );
  const activeStudentCount = roster.filter(
    (row) => row.member_status === "active" && row.member_role === "student"
  ).length;
  const hasStudents = activeStudentCount > 0;
  const needsSchoolAdminHandoff =
    org.type === "school" &&
    Boolean(org.parent_org_id) &&
    !roster.some(
      (row) =>
        row.profile_id !== user.id &&
        row.member_status === "active" &&
        row.member_role !== "student"
    );
  const isDirectSchoolAdmin =
    org.type === "school" &&
    isAdmin &&
    (org.owner_profile_id === user.id ||
      membership?.role === "admin" ||
      membership?.role === "school_admin");
  // Claimed school admin, pre-transfer: the owner is still the district-side
  // creator, so the handoff step belongs to the district workspace.
  const ownershipHandoffPending =
    org.type === "school" &&
    Boolean(org.parent_org_id) &&
    isDirectSchoolAdmin &&
    (org.owner_profile_id ?? org.created_by) !== user.id &&
    (!org.owner_profile_id || org.owner_profile_id === org.created_by);

  const today = new Date().toISOString().slice(0, 10);
  const activeEvents = events.filter((event) => event.status !== "archived");
  const upcoming = activeEvents.filter((e) => isUpcomingEvent(e, today));
  const past = activeEvents.filter((e) => !isUpcomingEvent(e, today));
  const attendingUpcoming = attendedEvents.filter((e) =>
    isUpcomingEvent(e, today)
  );

  const sortedDrafts = [...drafts].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
  const freshestDraft = sortedDrafts[0] ?? null;
  const priorityUpcoming =
    upcoming.find((e) => e.status === "rejected") ??
    upcoming.find((e) => e.status === "draft") ??
    upcoming.find((e) => e.status === "pending_review") ??
    upcoming[0] ??
    null;
  const submittedEvent = submitted
    ? events.find((event) => event.slug === submitted)
    : null;

  const coachMission = (() => {
    if (!isCoach || org.type === "district") return null;
    if (!canManageTournaments) {
      return {
        title: "Review the roster and groups",
        description:
          "Your assistant-coach access is read-only. A coach or administrator handles invitations, roster changes, announcements, and competition operations.",
        action: {
          href: `/orgs/${org.slug}/roster`,
          label: "Review roster",
        },
        secondary: {
          href: `/orgs/${org.slug}/competitions`,
          label: "View competitions",
        },
      };
    }
    if (needsSchoolAdminHandoff) {
      // The People page is admin-only — never route a coach into its redirect.
      if (!isAdmin) {
        return {
          title: "This school needs an administrator",
          description:
            "A school administrator owns the roster and day-to-day setup. Delegation is handled from the district workspace — ask your district administrator to invite one.",
          action: { href: "/orgs", label: "Back to organizations" },
          secondary: {
            href: `/orgs/${org.slug}/competitions`,
            label: "View competitions",
          },
        };
      }
      return {
        title: "Delegate this school",
        description:
          "Invite a school administrator before provisioning students. They can own the roster and day-to-day setup.",
        action: {
          href: `/orgs/${org.slug}/people`,
          label: "Invite school administrator",
        },
        secondary: { href: "/orgs", label: "Back to organizations" },
      };
    }
    if (isDirectSchoolAdmin) {
      // Pending verification is Causey-side work — don't block the mission on it.
      if (org.verification_status === "rejected") {
        return {
          title: "Correct the school record",
          description:
            "Review the platform note and correct the school details before asking for another verification review.",
          action: {
            href: `/orgs/${org.slug}/settings#verification`,
            label: "Correct school details",
          },
          secondary: {
            href: `/orgs/${org.slug}/people`,
            label: "Manage people",
          },
        };
      }
      if (ownershipHandoffPending) {
        return {
          title: "Ownership handoff is pending",
          description:
            "The district workspace completes the handoff from this school's settings — there is nothing to submit. Staffing and roster setup can continue meanwhile.",
          action: {
            href: `/orgs/${org.slug}/people`,
            label: "Review staffing",
          },
          secondary: {
            href: `/orgs/${org.slug}/settings#ownership`,
            label: "View ownership status",
          },
        };
      }
      // Staffing leads only while the roster is empty; a provisioned school
      // advances to the competition chain below.
      if (!hasStudents) {
        return {
          title: "Review school staffing",
          description:
            "Keep administrator and coach access current, then bring students onto the roster.",
          action: {
            href: `/orgs/${org.slug}/people`,
            label: "Manage people",
          },
          secondary: {
            href: `/orgs/${org.slug}/roster#add-students`,
            label: "Invite students",
          },
        };
      }
    }
    if (freshestDraft && priorityUpcoming?.status !== "rejected") {
      return {
        title: `Resume “${freshestDraft.data.name.trim() || "Untitled competition"}”`,
        description: `Draft saved ${formatSavedAt(freshestDraft.updated_at)}${
          freshestDraft.cover_image_url
            ? ". Cover is ready — finish details and choose who can see it."
            : ". Add a cover, finish details, and choose who can see it."
        }`,
        action: {
          href: `/orgs/${org.slug}/competitions/new?draft=${freshestDraft.id}&host=${freshestDraft.org_id}`,
          label: "Resume draft",
        },
        secondary: {
          href: `/orgs/${org.slug}/competitions/new`,
          label: "Create another competition",
        },
      };
    }
    if (priorityUpcoming) {
      const action = coachEventAction(priorityUpcoming);
      return {
        title:
          priorityUpcoming.status === "rejected"
            ? `Fix “${priorityUpcoming.name}”`
            : priorityUpcoming.status === "pending_review"
              ? `“${priorityUpcoming.name}” is awaiting review`
              : `Next up: ${priorityUpcoming.name}`,
        description: `${formatDateRange(
          priorityUpcoming.start_date,
          priorityUpcoming.end_date
        )}${
          priorityUpcoming.city
            ? ` · ${priorityUpcoming.city}, ${priorityUpcoming.state}`
            : ""
        }. ${
          priorityUpcoming.status === "rejected"
            ? `Platform review returned this listing. ${
                priorityUpcoming.moderation_note
                  ? `Review note: “${priorityUpcoming.moderation_note}”`
                  : "Open the listing to review the requested changes."
              }`
            : priorityUpcoming.status === "pending_review"
              ? "You can still prep invites while the listing is in review."
              : hasStudents
                ? "Invite your roster and track RSVPs from manage."
                : "Add students to the roster before invites will have anyone to reach."
        }`,
        action:
          priorityUpcoming.status === "rejected" || hasStudents
            ? { href: action.href, label: action.label }
            : {
                href: `/orgs/${org.slug}/roster#add-students`,
                label: "Invite students",
              },
        secondary:
          priorityUpcoming.status === "rejected" || hasStudents
            ? {
                href: `/orgs/${org.slug}/competitions/new`,
                label: "Create another competition",
              }
            : { href: action.href, label: action.label },
      };
    }
    if (!hasStudents) {
      return {
        title: "Invite your first students",
        description: org.join_code
          ? "Share the join link from the roster so students can join. Create a competition once you have people to invite."
          : "Open the roster to add students. Create a competition once you have people to invite.",
        action: {
          href: `/orgs/${org.slug}/roster#add-students`,
          label: "Open roster",
        },
        secondary: {
          href: `/orgs/${org.slug}/competitions/new`,
          label: "Create competition anyway",
        },
      };
    }
    return {
      title: "Create your first competition",
      description:
        "Create an event page, choose its audience, invite your roster, and track who can attend.",
      action: {
        href: `/orgs/${org.slug}/competitions/new`,
        label: "Create competition",
      },
      secondary: {
        href: `/orgs/${org.slug}/roster`,
        label: "Open roster",
      },
    };
  })();

  const otherDrafts = freshestDraft
    ? sortedDrafts.filter((d) => d.id !== freshestDraft.id)
    : sortedDrafts;
  const otherUpcoming = priorityUpcoming
    ? upcoming.filter((e) => e.id !== priorityUpcoming.id)
    : upcoming;
  const districtReadiness =
    districtReadinessResult?.ok === true
      ? districtReadinessResult.data
      : null;
  const districtReadinessError = districtReadinessResult?.ok === false;
  const districtAction = districtReadiness
    ? getDistrictReadinessAction(districtReadiness)
    : null;
  const readySchoolCount =
    districtReadiness?.schools.filter(
      (school) =>
        getDistrictSchoolReadinessStatus(school, org.slug).ready
    ).length ?? 0;

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="overview"
        showRoster={isCoach && org.type !== "district"}
        showAdmin={isAdmin}
        orgType={org.type}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          {ORG_TYPE_LABEL[org.type] ?? org.type}
          {org.state ? ` · ${org.state}` : ""}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isCoach && org.type !== "district"
            ? `${activeStudentCount} active ${
                activeStudentCount === 1 ? "student" : "students"
              }`
            : `${activeMemberCount} active ${
                activeMemberCount === 1 ? "member" : "members"
              }`}
          {isAdmin
            ? ` · ${ADMIN_WORKSPACE_LABEL[org.type] ?? "organization administration"}`
            : canManageTournaments
              ? " · coaching workspace"
              : isCoach
                ? " · assistant workspace"
              : ""}
          {org.type === "school" && org.parent_org_id
            ? " · part of a district"
            : ""}
        </p>

        {isAdmin && org.verification_status === "pending" ? (
          <p
            className="mt-4 max-w-2xl border-l-2 border-line pl-4 text-sm text-muted"
            role="status"
          >
            Platform review pending. Causey verifies organization identity in
            the admin queue — there is nothing to submit here. Continue staffing
            and competitions while that review finishes.
          </p>
        ) : null}
        {isAdmin && org.verification_status === "rejected" ? (
          <p
            className="mt-4 max-w-2xl border-l-2 border-brand-red pl-4 text-sm text-muted-strong"
            role="status"
          >
            Platform review returned this organization.{" "}
            <Link
              href={`/orgs/${org.slug}/settings#verification`}
              className="font-semibold text-brand-red hover:underline"
            >
              Correct the record in settings
            </Link>
            .
          </p>
        ) : null}

        {submittedEvent?.status === "pending_review" ? (
          <section
            className="mt-8 rounded-2xl border border-brand-red/30 bg-accent-soft p-5"
            role="status"
          >
            <h2 className="text-base font-semibold text-foreground">
              Submitted for platform review
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted-strong">
              {submittedEvent.category === "other"
                ? `“${submittedEvent.name}” does not have a public link until review. Custom competition types do not have a public directory.`
                : `“${submittedEvent.name}” is not in its category directory yet.`}{" "}
              You can prepare invitations while Causey reviews the listing; its
              status will update here.
            </p>
          </section>
        ) : null}

        {org.type === "district" && isAdmin && districtReadinessError ? (
          <PortalErrorState
            title="School readiness could not load"
            description="Retry this workspace before adding schools or changing setup, so you do not act on incomplete information."
            action={{
              href: `/orgs/${org.slug}?retry=readiness`,
              label: "Retry school readiness",
            }}
          />
        ) : null}

        {org.type === "district" && isAdmin && districtAction ? (
          <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <PortalMission
                title={districtAction.title}
                description={districtAction.description}
                action={{
                  href: districtAction.href,
                  label: districtAction.label,
                }}
                secondary={{
                  href: `/orgs/${org.slug}/reports`,
                  label: "View aggregate reporting",
                }}
              />
            </div>

            <div className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    School pilot readiness
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {readySchoolCount} of{" "}
                    {districtReadiness?.schools.length ?? 0} ready
                  </p>
                </div>
                <Link
                  href={`/orgs/${org.slug}/settings#schools`}
                  className="text-xs font-semibold text-muted-strong hover:text-brand-red"
                >
                  {districtReadiness?.schools.length
                    ? "Add another school"
                    : "Add a school"}
                </Link>
              </div>

              {!districtReadiness?.schools.length ? (
                <p className="mt-4 max-w-prose text-sm text-muted">
                  No school workspaces yet.{" "}
                  <Link
                    href={`/orgs/${org.slug}/settings#schools`}
                    className="font-semibold text-brand-red hover:underline"
                  >
                    Create the first school
                  </Link>
                  , then delegate its administrator before provisioning
                  students.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {districtReadiness.schools.map((school) => {
                    const status = getDistrictSchoolReadinessStatus(
                      school,
                      org.slug
                    );
                    return (
                      <li
                        key={school.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <Link
                            href={`/orgs/${school.slug}`}
                            className="text-sm font-semibold text-foreground hover:text-brand-red"
                          >
                            {school.name}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {status.label}
                            {school.activeStudents
                              ? ` · ${school.activeStudents} ${
                                  school.activeStudents === 1
                                    ? "student"
                                    : "students"
                                }`
                              : ""}
                          </p>
                        </div>
                        <Link
                          href={status.href}
                          className="text-xs font-semibold text-brand-red hover:underline"
                        >
                          {status.actionLabel}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {coachMission ? (
          <div className="mt-8">
            <PortalMission
              title={coachMission.title}
              description={coachMission.description}
              action={coachMission.action}
              secondary={coachMission.secondary}
            />
          </div>
        ) : null}

        {announcements.length ? (
          <section className="mt-8 border-l-2 border-brand-red pl-5">
            <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
              Latest announcement
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground">
              {announcements[0].title}
            </h2>
            <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-muted">
              {announcements[0].body}
            </p>
          </section>
        ) : null}

        {canManageTournaments && !coachMission ? (
          <section className="mt-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Hosted competitions
                </h2>
                <p className="mt-1 max-w-lg text-xs text-muted">
                  Create an event page, choose its audience, then invite your roster.
                </p>
              </div>
              <Link
                href={`/orgs/${org.slug}/competitions/new`}
                className="cta-enabled inline-flex shrink-0"
              >
                Create competition
              </Link>
            </div>
          </section>
        ) : null}

        {!canManageTournaments ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Upcoming competitions
            </h2>
            {!upcoming.length ? (
              <PortalEmptyState
                title="No competitions are scheduled"
                description={
                  isCoach
                    ? "A coach or administrator publishes competitions. You can review the roster while you wait."
                    : "Search public tournament listings, or check back after your coach publishes an event."
                }
                action={
                  isCoach
                    ? {
                        href: `/orgs/${org.slug}/roster`,
                        label: "Review roster",
                      }
                    : { href: "/#search", label: "Search tournaments" }
                }
              />
            ) : (
              <ul className="mt-2">
                {upcoming.map((event) => {
                  const rsvp = myRsvpByCompetition.get(event.id);
                  return (
                    <PortalListRow
                      key={event.id}
                      organizationHosted
                      href={`/event/${event.slug}`}
                      title={event.name}
                      meta={`${competitionTypeLabel({
                        category: event.category,
                        customCategoryName: event.custom_category_name,
                      })} · ${formatDateRange(
                        event.start_date,
                        event.end_date
                      )}${
                        event.city ? ` · ${event.city}, ${event.state}` : ""
                      } · ${formatFeeCents(event.entry_fee_cents)}${
                        event.visibility === "private" ? " · members only" : ""
                      }`}
                      trailing={
                        rsvp ? (
                          <RsvpButtons
                            competitionId={event.id}
                            profileId={user.id}
                            status={rsvp.status}
                            eventSlug={event.slug}
                          />
                        ) : null
                      }
                    />
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {canManageTournaments &&
        (otherDrafts.length > 0 ||
          otherUpcoming.length > 0 ||
          Boolean(freshestDraft && priorityUpcoming)) ? (
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Hosted competitions
            </h2>
            {otherDrafts.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Other drafts
                </h3>
                <ul className="mt-1">
                  {otherDrafts.map((draft) => (
                    <PortalListRow
                      key={draft.id}
                      organizationHosted
                      title={draft.data.name.trim() || "Untitled competition"}
                      meta={`${competitionTypeLabel({
                        category: draft.data.category,
                        customCategoryName: draft.data.customCategoryName,
                      })} · saved ${formatSavedAt(draft.updated_at)}${
                        draft.cover_image_url
                          ? " · cover added"
                          : " · cover still needed"
                      }`}
                      trailing={
                        <Link
                          href={`/orgs/${org.slug}/competitions/new?draft=${draft.id}&host=${draft.org_id}`}
                          className="text-sm font-semibold text-brand-red hover:underline"
                        >
                          Resume
                        </Link>
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {otherUpcoming.length > 0 || (freshestDraft && priorityUpcoming) ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground">
                  {freshestDraft && priorityUpcoming
                    ? "Hosted & in review"
                    : "Also upcoming"}
                </h3>
                <ul className="mt-1">
                  {(freshestDraft && priorityUpcoming
                    ? [priorityUpcoming, ...otherUpcoming]
                    : otherUpcoming
                  ).map((event) => {
                    const action = coachEventAction(event);
                    return (
                      <PortalListRow
                        key={event.id}
                        organizationHosted
                        href={`/event/${event.slug}`}
                        title={event.name}
                        meta={`${competitionTypeLabel({
                          category: event.category,
                          customCategoryName: event.custom_category_name,
                        })} · ${formatDateRange(
                          event.start_date,
                          event.end_date
                        )}${
                          event.city ? ` · ${event.city}, ${event.state}` : ""
                        } · ${formatFeeCents(event.entry_fee_cents)}${
                          event.visibility === "private" ? " · members only" : ""
                        }${
                          event.status === "pending_review"
                            ? " · awaiting platform review"
                            : event.status === "rejected"
                              ? " · returned for changes"
                              : ""
                        }`}
                        trailing={
                          event.status === "pending_review" ? (
                            <span className="text-xs font-semibold text-muted-strong">
                              Review pending
                            </span>
                          ) : (
                            <Link
                              href={action.href}
                              className="text-sm font-semibold text-brand-red hover:underline"
                            >
                              {action.label}
                            </Link>
                          )
                        }
                      />
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {attendingUpcoming.length ? (
          <section className="mt-10 border-t border-line pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              We&rsquo;re attending
            </h2>
            <p className="mt-1 text-xs text-muted">
              Public competitions this organization is going to.
            </p>
            <ul className="mt-2">
              {attendingUpcoming.map((event) => {
                const rsvp = myRsvpByCompetition.get(event.id);
                return (
                  <PortalListRow
                    key={event.id}
                    href={`/event/${event.slug}`}
                    title={event.name}
                    meta={`${formatDateRange(
                      event.start_date,
                      event.end_date
                    )}${
                      event.city ? ` · ${event.city}, ${event.state}` : ""
                    } · ${formatFeeCents(event.entry_fee_cents)}`}
                    trailing={
                      rsvp ? (
                        <RsvpButtons
                          competitionId={event.id}
                          profileId={user.id}
                          status={rsvp.status}
                          eventSlug={event.slug}
                        />
                      ) : canManageTournaments ? (
                        <Link
                          href={`/event/${event.slug}/manage`}
                          className="text-sm font-semibold text-brand-red hover:underline"
                        >
                          Manage entrants
                        </Link>
                      ) : null
                    }
                  />
                );
              })}
            </ul>
          </section>
        ) : null}

        {past.length ? (
          <section className="mt-10 border-t border-line pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              {canManageTournaments ? "Past hosted" : "Past competitions"}
            </h2>
            <ul className="mt-2">
              {past.map((event) => (
                <PortalListRow
                  key={event.id}
                  organizationHosted
                  href={`/event/${event.slug}`}
                  title={event.name}
                  meta={`${competitionTypeLabel({
                    category: event.category,
                    customCategoryName: event.custom_category_name,
                  })} · ${formatDateRange(event.start_date, event.end_date)}`}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {canManageTournaments ? (
          <section className="mt-10 border-t border-line pt-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Coach announcement
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Share one clear operational update with members and linked
                  parents. Avoid student-specific information.
                </p>
              </div>
              <AnnouncementForm orgId={org.id} orgSlug={org.slug} />
            </div>
          </section>
        ) : null}

        {!isCoach && membership?.status === "active" ? (
          <div className="mt-10 border-t border-line pt-8">
            <LeaveOrgButton orgId={org.id} orgName={org.name} />
          </div>
        ) : null}
      </div>
    </>
  );
}
