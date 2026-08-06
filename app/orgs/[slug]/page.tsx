import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JoinCodePanel } from "@/components/JoinCodePanel";
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
  const { org, membership, isCoach, activeMemberCount, events } = view;

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
      <OrgSubnavBar slug={org.slug} orgName={org.name} tab="overview" showRoster={isCoach} />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">
          {ORG_TYPE_LABEL[org.type] ?? org.type}
          {org.state ? ` · ${org.state}` : ""}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {activeMemberCount} active {activeMemberCount === 1 ? "member" : "members"}
          {isCoach ? " · you coach this organization" : ""}
        </p>

        {isCoach ? (
          <div className="mt-6">
            <Link
              href={`/orgs/${org.slug}/tournaments/new`}
              className="cta-enabled inline-flex"
            >
              Create tournament
            </Link>
          </div>
        ) : null}

        {isCoach && org.join_code ? (
          <section className="section-rule mt-10 pt-8">
            <JoinCodePanel orgId={org.id} orgSlug={org.slug} joinCode={org.join_code} />
          </section>
        ) : null}

        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Upcoming tournaments</h2>
          {!upcoming.length ? (
            <p className="mt-3 text-sm text-muted">
              {isCoach
                ? "Nothing scheduled. Create a tournament and invite your roster."
                : "Nothing scheduled yet — check back soon."}
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
                        {event.status === "draft"
                          ? " · draft, nobody else can see it yet"
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
                    ) : isCoach ? (
                      <Link
                        href={`/event/${event.slug}/manage`}
                        className="text-sm font-semibold text-brand-red hover:underline"
                      >
                        {event.status === "draft"
                          ? "Review and publish"
                          : "Manage entrants"}
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
            <h2 className="text-sm font-semibold text-foreground">Past tournaments</h2>
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

        {!isCoach && membership?.status === "active" ? (
          <div className="section-rule mt-10 pt-8">
            <LeaveOrgButton orgId={org.id} orgName={org.name} />
          </div>
        ) : null}
      </div>
    </>
  );
}
