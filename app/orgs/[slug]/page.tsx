import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  const { org, membership, isCoach, activeMemberCount, events, drafts } = view;

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
                        Manage invites
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

        {!isCoach && membership?.status === "active" ? (
          <div className="section-rule mt-10 pt-8">
            <LeaveOrgButton orgId={org.id} orgName={org.name} />
          </div>
        ) : null}
      </div>
    </>
  );
}
