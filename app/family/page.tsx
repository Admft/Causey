import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissRecommendationButton } from "@/components/DismissRecommendationButton";
import { LinkChildForm } from "@/components/LinkChildForm";
import { RsvpButtons } from "@/components/RsvpButtons";
import { UnlinkChildButton } from "@/components/UnlinkChildButton";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  getChildrenWithEvents,
  getMyRecommendations,
  getPendingChildRequestCount,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { formatDateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Family",
  description: "Your children's clubs, tournaments, and RSVPs in one place.",
};

export default async function FamilyPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Family
        </h1>
        <p className="mt-3 text-sm text-muted">
          Connect Supabase (set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env) to use family accounts.
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/family");
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "parent") redirect("/me");

  const [children, pendingCount, recommendations] = await Promise.all([
    getChildrenWithEvents(user.id),
    getPendingChildRequestCount(user.id),
    getMyRecommendations(user.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const childrenByPriority = children
    .map((child) => {
      const upcoming = child.entrants
        .filter(
          (row) => row.competition && isUpcomingEvent(row.competition, today)
        )
        .sort((a, b) => {
          if (a.status === b.status) {
            return (a.competition?.start_date ?? "").localeCompare(
              b.competition?.start_date ?? ""
            );
          }
          return a.status === "invited" ? -1 : 1;
        });
      return {
        ...child,
        upcoming,
        responseCount: upcoming.filter((row) => row.status === "invited").length,
      };
    })
    .sort((a, b) => b.responseCount - a.responseCount);
  const totalResponsesNeeded = childrenByPriority.reduce(
    (total, child) => total + child.responseCount,
    0
  );
  const firstChildNeedingResponse = childrenByPriority.find(
    (child) => child.responseCount > 0
  );

  const linkStudentSection = (
    <section id="link-student" className="section-rule mt-10 scroll-mt-24 pt-8">
      <h2 className="text-sm font-semibold text-foreground">
        {pendingCount > 0 ? "Link another student" : "Link a student"}
      </h2>
      <div className="mt-4">
        <LinkChildForm />
      </div>
      {pendingCount > 0 ? (
        <p className="mt-3 text-sm text-muted-strong">
          {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}.
          Your student needs to accept from their account page.
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Family</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Your students
      </h1>
      <p className="mt-2 text-sm text-muted">
        Link with your child&rsquo;s account to follow their clubs and RSVP to
        tournaments for them.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">
          {!children.length
            ? pendingCount
              ? "Waiting for your student"
              : "Link your first student"
            : totalResponsesNeeded
              ? `${totalResponsesNeeded} ${
                  totalResponsesNeeded === 1 ? "RSVP needs" : "RSVPs need"
                } your response`
              : "Your family is caught up"}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {!children.length
            ? pendingCount
              ? "Your request is pending. Your student needs to accept it from their account page before their activity appears here."
              : "Send a link request so tournament invitations and club activity appear here."
            : totalResponsesNeeded
              ? `Start with ${firstChildNeedingResponse?.display_name ?? "your student"}, then review any other unanswered invitations.`
              : "No tournament invitations need a response right now."}
        </p>
        {!children.length && pendingCount ? null : (
          <Link
            href={
              !children.length
                ? "#link-student"
                : totalResponsesNeeded
                  ? `#student-${firstChildNeedingResponse?.profile_id}`
                  : "/chess"
            }
            className="cta-enabled mt-5 inline-flex"
          >
            {!children.length
              ? "Link a student"
              : totalResponsesNeeded
                ? "Review RSVPs"
                : "Search tournaments"}
          </Link>
        )}
      </section>

      {!children.length ? linkStudentSection : null}

      {!children.length ? (
        <section className="section-rule mt-10 pt-8">
          <p className="text-sm text-muted">
            No linked students yet. Once your child accepts, their clubs and
            tournament invites show up here.
          </p>
        </section>
      ) : (
        childrenByPriority.map((child) => {
          return (
            <section
              id={`student-${child.profile_id}`}
              key={child.profile_id}
              className="section-rule mt-10 scroll-mt-24 pt-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    {child.display_name}
                  </h2>
                  {child.responseCount ? (
                    <p className="mt-1 text-sm font-semibold text-brand-red">
                      {child.responseCount}{" "}
                      {child.responseCount === 1 ? "RSVP needs" : "RSVPs need"}{" "}
                      your response
                    </p>
                  ) : null}
                </div>
                <UnlinkChildButton
                  childProfileId={child.profile_id}
                  childName={child.display_name}
                />
              </div>
              <p className="mt-1 text-sm text-muted">
                {child.orgs.length
                  ? child.orgs.map((org, i) => (
                      <span key={org.id}>
                        {i > 0 ? " · " : ""}
                        <Link
                          href={`/orgs/${org.slug}`}
                          className="font-medium text-muted-strong hover:text-foreground"
                        >
                          {org.name}
                        </Link>
                      </span>
                    ))
                  : "Not in any club yet."}
              </p>

              {!child.upcoming.length ? (
                <p className="mt-4 text-sm text-muted">
                  No upcoming tournament invites.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {child.upcoming.map((row) => (
                    <li
                      key={row.competition_id}
                      className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <Link
                          href={`/event/${row.competition!.slug}`}
                          className="font-semibold text-foreground hover:text-brand-red"
                        >
                          {row.competition!.name}
                        </Link>
                        <span className="mt-1 block text-xs text-muted">
                          {formatDateRange(
                            row.competition!.start_date,
                            row.competition!.end_date
                          )}
                          {row.competition!.city
                            ? ` · ${row.competition!.city}, ${row.competition!.state}`
                            : ""}
                          {row.responded_by === user.id
                            ? " · RSVP’d by you"
                            : row.responded_by === child.profile_id
                              ? ` · RSVP’d by ${child.display_name}`
                              : ""}
                        </span>
                      </div>
                      <RsvpButtons
                        competitionId={row.competition_id}
                        profileId={child.profile_id}
                        status={row.status}
                        eventSlug={row.competition!.slug}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {children.length ? linkStudentSection : null}

      {recommendations.length ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">
            Recommended to you
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {recommendations.map((rec) => (
              <li
                key={rec.id}
                className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/event/${rec.competition!.slug}`}
                    className="font-semibold text-foreground hover:text-brand-red"
                  >
                    {rec.competition!.name}
                  </Link>
                  <span className="mt-1 block text-xs text-muted">
                    {formatDateRange(
                      rec.competition!.start_date,
                      rec.competition!.end_date
                    )}
                    {` · from ${rec.from_name}`}
                    {rec.note ? ` — “${rec.note}”` : ""}
                  </span>
                </div>
                <DismissRecommendationButton id={rec.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
