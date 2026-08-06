import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissRecommendationButton } from "@/components/DismissRecommendationButton";
import { LinkChildForm } from "@/components/LinkChildForm";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
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
  title: "Family desk",
  description: "See which student needs an RSVP and act from one place.",
};

export default async function FamilyPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Family desk
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
  const actionInbox = childrenByPriority.flatMap((child) =>
    child.upcoming
      .filter((row) => row.status === "invited")
      .map((row) => ({ child, row }))
  );

  const linkStudentSection = (
    <section id="link-student" className="mt-12 scroll-mt-24">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
        {pendingCount > 0 ? "Link another student" : "Link a student"}
      </h2>
      <div className="mt-3 max-w-lg">
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
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Parent desk
          </p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            Who needs you
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Answer each student&rsquo;s tournament invitations here. Clubs and
            link requests stay secondary.
          </p>

          <div className="mt-8">
            <PortalMission
              title={
                !children.length
                  ? pendingCount
                    ? "Waiting for your student"
                    : "Link your first student"
                  : totalResponsesNeeded
                    ? `${totalResponsesNeeded} ${
                        totalResponsesNeeded === 1 ? "RSVP needs" : "RSVPs need"
                      } a response`
                    : "Your family is caught up"
              }
              description={
                !children.length
                  ? pendingCount
                    ? "Your request is pending. Your student needs to accept it before their activity appears here."
                    : "Send a link request so tournament invitations appear in this desk."
                  : totalResponsesNeeded
                    ? `Start with ${firstChildNeedingResponse?.display_name ?? "your student"}, then work down the list.`
                    : "No tournament invitations need a response right now."
              }
              action={
                !children.length && pendingCount
                  ? undefined
                  : {
                      href: !children.length
                        ? "#link-student"
                        : totalResponsesNeeded
                          ? "#needs-response"
                          : "/chess",
                      label: !children.length
                        ? "Link a student"
                        : totalResponsesNeeded
                          ? "Review RSVPs"
                          : "Search tournaments",
                    }
              }
            />
          </div>

          {!children.length ? linkStudentSection : null}

          {actionInbox.length ? (
            <section id="needs-response" className="mt-10 scroll-mt-24">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                Needs a response
              </h2>
              <ul className="mt-2">
                {actionInbox.map(({ child, row }) => (
                  <li
                    key={`${child.profile_id}-${row.competition_id}`}
                    className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-strong">
                        {child.display_name}
                      </p>
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
            </section>
          ) : null}

          {childrenByPriority.map((child) => {
            const answered = child.upcoming.filter(
              (row) => row.status !== "invited"
            );
            return (
              <section
                id={`student-${child.profile_id}`}
                key={child.profile_id}
                className="mt-10 scroll-mt-24 border-t border-line pt-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    {child.display_name}
                  </h2>
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
                ) : answered.length ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-muted-strong">
                      Answered
                    </h3>
                    <ul className="mt-1">
                      {answered.map((row) => (
                        <PortalListRow
                          key={row.competition_id}
                          href={`/event/${row.competition!.slug}`}
                          title={row.competition!.name}
                          meta={`${formatDateRange(
                            row.competition!.start_date,
                            row.competition!.end_date
                          )}${
                            row.responded_by === user.id
                              ? " · RSVP’d by you"
                              : row.responded_by === child.profile_id
                                ? ` · RSVP’d by ${child.display_name}`
                                : ""
                          }`}
                          trailing={
                            <RsvpButtons
                              competitionId={row.competition_id}
                              profileId={child.profile_id}
                              status={row.status}
                              eventSlug={row.competition!.slug}
                            />
                          }
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}

          {children.length ? linkStudentSection : null}

          {recommendations.length ? (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                Recommended to you
              </h2>
              <ul className="mt-2">
                {recommendations.map((rec) => (
                  <PortalListRow
                    key={rec.id}
                    href={`/event/${rec.competition!.slug}`}
                    title={rec.competition!.name}
                    meta={`${formatDateRange(
                      rec.competition!.start_date,
                      rec.competition!.end_date
                    )} · from ${rec.from_name}${
                      rec.note ? ` — “${rec.note}”` : ""
                    }`}
                    trailing={<DismissRecommendationButton id={rec.id} />}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-line bg-surface-soft/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Students
            </p>
            {!children.length ? (
              <p className="mt-2 text-sm text-muted">None linked yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {childrenByPriority.map((child) => (
                  <li key={child.profile_id}>
                    <a
                      href={`#student-${child.profile_id}`}
                      className="block text-sm font-semibold text-foreground hover:text-brand-red"
                    >
                      {child.display_name}
                      {child.responseCount ? (
                        <span className="mt-0.5 block text-xs font-medium text-brand-red">
                          {child.responseCount}{" "}
                          {child.responseCount === 1 ? "RSVP" : "RSVPs"}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs font-medium text-muted">
                          Caught up
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
