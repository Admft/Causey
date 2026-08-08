import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/AnnouncementForm";
import { LeaveOrgButton } from "@/components/LeaveOrgButton";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getSessionUser } from "@/lib/auth/session";
import {
  getMyEntrantRows,
  getOrgAttendedEvents,
  getOrgBySlugForViewer,
  getOrgRoster,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { formatDateRange, formatFeeCents } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization",
  description: "Roster, join code, and tournaments for this organization.",
};

const ORG_TYPE_LABEL: Record<string, string> = {
  school: "School",
  club: "Club",
  team: "Team",
  district: "District",
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
      label: "Review and publish",
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  const {
    org,
    membership,
    isCoach,
    isAdmin,
    activeMemberCount,
    events,
    drafts,
    schools,
    announcements,
  } = view;

  const [entrantRows, attendedEvents, roster] = await Promise.all([
    isCoach ? Promise.resolve([]) : getMyEntrantRows(user.id),
    getOrgAttendedEvents(org.id),
    isCoach && org.type !== "district"
      ? getOrgRoster(org.id)
      : Promise.resolve([]),
  ]);
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

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => isUpcomingEvent(e, today));
  const past = events.filter((e) => !isUpcomingEvent(e, today));
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

  const coachMission = (() => {
    if (!isCoach || org.type === "district") return null;
    if (needsSchoolAdminHandoff) {
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
    if (freshestDraft) {
      return {
        title: `Resume “${freshestDraft.data.name.trim() || "Untitled tournament"}”`,
        description: `Draft saved ${formatSavedAt(freshestDraft.updated_at)}${
          freshestDraft.cover_image_url
            ? ". Cover is ready — finish details and publish when you’re set."
            : ". Add a cover and finish details before you publish."
        }`,
        action: {
          href: `/orgs/${org.slug}/tournaments/new?draft=${freshestDraft.id}`,
          label: "Resume draft",
        },
        secondary: {
          href: `/orgs/${org.slug}/tournaments/new`,
          label: "Create another tournament",
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
            ? "Platform review returned this listing — update it and resubmit."
            : priorityUpcoming.status === "pending_review"
              ? "You can still prep invites while the listing is in review."
              : hasStudents
                ? "Invite your roster and track RSVPs from manage."
                : "Add students to the roster before invites will have anyone to reach."
        }`,
        action: hasStudents
          ? { href: action.href, label: action.label }
          : {
              href: `/orgs/${org.slug}/roster#add-students`,
              label: "Invite students",
            },
        secondary: hasStudents
          ? {
              href: `/orgs/${org.slug}/tournaments/new`,
              label: "Create another tournament",
            }
          : { href: action.href, label: action.label },
      };
    }
    if (!hasStudents) {
      return {
        title: "Invite your first students",
        description: org.join_code
          ? "Share the join link from the roster so students can join. Create a tournament once you have people to invite."
          : "Open the roster to add students. Create a tournament once you have people to invite.",
        action: {
          href: `/orgs/${org.slug}/roster#add-students`,
          label: "Open roster",
        },
        secondary: {
          href: `/orgs/${org.slug}/tournaments/new`,
          label: "Create tournament anyway",
        },
      };
    }
    return {
      title: "Create your first tournament",
      description:
        "Publish an event page, invite your roster with one click, and track who can attend.",
      action: {
        href: `/orgs/${org.slug}/tournaments/new`,
        label: "Create tournament",
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

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="overview"
        showRoster={isCoach && org.type !== "district"}
        showAdmin={isAdmin}
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
            ? org.type === "district"
              ? " · district administration"
              : " · school administration"
            : isCoach
              ? " · coaching workspace"
              : ""}
        </p>

        {org.type === "district" && isAdmin ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-panel)]">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                District next step
              </p>
              <h2 className="mt-2 font-display text-display-sm font-bold tracking-tight text-foreground">
                {schools.length
                  ? "Keep every school’s program moving"
                  : "Add the first school in this district"}
              </h2>
              <p className="mt-2 max-w-prose text-sm text-muted">
                {schools.length
                  ? `${schools.length} ${
                      schools.length === 1 ? "school is" : "schools are"
                    } connected. Open reporting for participation and unresolved invitations.`
                  : "Create a school workspace, delegate its administrator, then invite staff and students."}
              </p>
              <Link
                href={
                  schools.length
                    ? `/orgs/${org.slug}/reports`
                    : `/orgs/${org.slug}/settings#schools`
                }
                className="cta-enabled mt-5 inline-flex"
              >
                {schools.length ? "Review district reporting" : "Add a school"}
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-surface-soft p-5">
              <p className="text-xs font-semibold text-muted-strong">
                School workspaces
              </p>
              {!schools.length ? (
                <p className="mt-3 text-sm text-muted">
                  None yet. Schools you provision will appear here.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {schools.slice(0, 5).map((school) => (
                    <li key={school.id} className="py-2.5">
                      <Link
                        href={`/orgs/${school.slug}`}
                        className="flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground hover:text-brand-red"
                      >
                        <span>{school.name}</span>
                        <span className="text-xs font-normal text-muted">
                          {school.verification_status === "verified"
                            ? "Verified"
                            : "Needs review"}
                        </span>
                      </Link>
                    </li>
                  ))}
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

        {isCoach && !coachMission ? (
          <section className="mt-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Hosted tournaments
                </h2>
                <p className="mt-1 max-w-lg text-xs text-muted">
                  Create and publish an event page, then invite your roster.
                </p>
              </div>
              <Link
                href={`/orgs/${org.slug}/tournaments/new`}
                className="cta-enabled inline-flex shrink-0"
              >
                Create tournament
              </Link>
            </div>
          </section>
        ) : null}

        {!isCoach ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Upcoming tournaments
            </h2>
            {!upcoming.length ? (
              <p className="mt-3 text-sm text-muted">
                Nothing scheduled yet. Check back soon.
              </p>
            ) : (
              <ul className="mt-2">
                {upcoming.map((event) => {
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

        {isCoach &&
        (otherDrafts.length > 0 ||
          otherUpcoming.length > 0 ||
          Boolean(freshestDraft && priorityUpcoming)) ? (
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Hosted tournaments
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
                      title={draft.data.name.trim() || "Untitled tournament"}
                      meta={`Saved ${formatSavedAt(draft.updated_at)}${
                        draft.cover_image_url
                          ? " · cover added"
                          : " · cover still needed"
                      }`}
                      trailing={
                        <Link
                          href={`/orgs/${org.slug}/tournaments/new?draft=${draft.id}`}
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
                    ? "Published & in review"
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
                        href={`/event/${event.slug}`}
                        title={event.name}
                        meta={`${formatDateRange(
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
              Public tournaments this organization is going to.
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
                      ) : isCoach ? (
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
              {isCoach ? "Past hosted" : "Past tournaments"}
            </h2>
            <ul className="mt-2">
              {past.map((event) => (
                <PortalListRow
                  key={event.id}
                  href={`/event/${event.slug}`}
                  title={event.name}
                  meta={formatDateRange(event.start_date, event.end_date)}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {isCoach ? (
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
