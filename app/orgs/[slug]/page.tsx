import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/AnnouncementForm";
import { LeaveOrgButton } from "@/components/LeaveOrgButton";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getSessionUser } from "@/lib/auth/session";
import {
  getMyEntrantRows,
  getOrgAttendedEvents,
  getOrgBySlugForViewer,
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

  const [entrantRows, attendedEvents] = await Promise.all([
    isCoach ? Promise.resolve([]) : getMyEntrantRows(user.id),
    getOrgAttendedEvents(org.id),
  ]);
  const myRsvpByCompetition = new Map(
    entrantRows.map((row) => [row.competition_id, row])
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => isUpcomingEvent(e, today));
  const past = events.filter((e) => !isUpcomingEvent(e, today));
  const attendingUpcoming = attendedEvents.filter((e) =>
    isUpcomingEvent(e, today)
  );

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="overview"
        showRoster={isCoach}
        showAdmin={isAdmin}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          {ORG_TYPE_LABEL[org.type] ?? org.type}
          {org.state ? ` · ${org.state}` : ""}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {activeMemberCount} active {activeMemberCount === 1 ? "member" : "members"}
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

        <section className="section-rule mt-8 pt-8">
          {isCoach ? (
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Hosted tournaments
                </h2>
                <p className="mt-1 max-w-lg text-xs text-muted">
                  Create and publish an event page, then invite your roster and
                  track replies.
                </p>
              </div>
              <Link
                href={`/orgs/${org.slug}/tournaments/new`}
                className="cta-enabled inline-flex shrink-0"
              >
                Create tournament
              </Link>
            </div>
          ) : (
            <h2 className="text-sm font-semibold text-foreground">
              Upcoming tournaments
            </h2>
          )}
          {isCoach && drafts.length ? (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-muted-strong">
                Drafts to finish
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {drafts.map((draft) => (
                  <li
                    key={draft.id}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {draft.data.name.trim() || "Untitled tournament"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Saved {formatSavedAt(draft.updated_at)}
                        {draft.cover_image_url ? " · cover added" : " · cover still needed"}
                      </p>
                    </div>
                    <Link
                      href={`/orgs/${org.slug}/tournaments/new?draft=${draft.id}`}
                      className="text-sm font-semibold text-brand-red hover:underline"
                    >
                      Resume draft
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!upcoming.length ? (
            <p className="mt-3 text-sm text-muted">
              {isCoach
                ? drafts.length
                  ? "No published tournaments yet. Finish a draft when you’re ready."
                  : "No hosted tournaments yet. Create one, then invite your roster."
                : "Nothing scheduled yet. Check back soon."}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {upcoming.map((event) => {
                const rsvp = myRsvpByCompetition.get(event.id);
                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/event/${event.slug}`}
                        className="font-semibold text-foreground hover:text-brand-red"
                      >
                        {event.name}
                      </Link>
                      <span className="mt-1 block text-xs text-muted">
                        {formatDateRange(event.start_date, event.end_date)}
                        {event.city ? ` · ${event.city}, ${event.state}` : ""}
                        {` · ${formatFeeCents(event.entry_fee_cents)}`}
                        {event.visibility === "private" ? " · members only" : ""}
                        {event.status === "pending_review"
                          ? " · awaiting platform review"
                          : event.status === "rejected"
                            ? " · returned for changes"
                            : ""}
                      </span>
                    </div>
                    {rsvp ? (
                      <RsvpButtons
                        competitionId={event.id}
                        profileId={user.id}
                        status={rsvp.status}
                        eventSlug={event.slug}
                      />
                    ) : isCoach && event.status === "pending_review" ? (
                      <span className="text-xs font-semibold text-muted-strong">
                        Review pending
                      </span>
                    ) : isCoach ? (
                      <Link
                        href={
                          event.status === "rejected"
                            ? `/event/${event.slug}/edit`
                            : `/event/${event.slug}/manage`
                        }
                        className="text-sm font-semibold text-brand-red hover:underline"
                      >
                        {event.status === "draft"
                          ? "Review and publish"
                          : event.status === "rejected"
                            ? "Fix and resubmit"
                            : "Manage invites"}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {attendingUpcoming.length ? (
          <section className="section-rule mt-10 pt-8">
            <h2 className="text-sm font-semibold text-foreground">
              We&rsquo;re attending
            </h2>
            <p className="mt-1 text-xs text-muted">
              Public tournaments this organization is going to.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {attendingUpcoming.map((event) => {
                const rsvp = myRsvpByCompetition.get(event.id);
                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/event/${event.slug}`}
                        className="font-semibold text-foreground hover:text-brand-red"
                      >
                        {event.name}
                      </Link>
                      <span className="mt-1 block text-xs text-muted">
                        {formatDateRange(event.start_date, event.end_date)}
                        {event.city ? ` · ${event.city}, ${event.state}` : ""}
                        {` · ${formatFeeCents(event.entry_fee_cents)}`}
                      </span>
                    </div>
                    {rsvp ? (
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
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {past.length ? (
          <section className="section-rule mt-10 pt-8">
            <h2 className="text-sm font-semibold text-foreground">
              {isCoach ? "Past hosted tournaments" : "Past tournaments"}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {past.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link
                    href={`/event/${event.slug}`}
                    className="font-medium text-foreground hover:text-brand-red"
                  >
                    {event.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateRange(event.start_date, event.end_date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isCoach ? (
          <section className="section-rule mt-10 pt-8">
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
          <div className="section-rule mt-10 pt-8">
            <LeaveOrgButton orgId={org.id} orgName={org.name} />
          </div>
        ) : null}
      </div>
    </>
  );
}
