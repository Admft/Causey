import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissRecommendationButton } from "@/components/DismissRecommendationButton";
import { FamilyRegistrationActions } from "@/components/FamilyRegistrationActions";
import { LinkChildForm } from "@/components/LinkChildForm";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
import { RsvpButtons } from "@/components/RsvpButtons";
import { StudentAccountHandoff } from "@/components/StudentAccountHandoff";
import { UnlinkChildButton } from "@/components/UnlinkChildButton";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { preferredDiscoveryHref } from "@/lib/category-discovery";
import {
  getChildrenWithEvents,
  getMyRecommendations,
  getPendingChildRequestCount,
  isSupabaseConfigured,
  isUpcomingEvent,
  type EntrantWithEvent,
} from "@/lib/data/portal";
import { formatDateRange, formatRecordedResult } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Family",
  description:
    "See which student needs a club RSVP or organizer registration and act from one place.",
};

function needsOrganizerRegistration(row: EntrantWithEvent): boolean {
  return (
    row.status === "going" &&
    Boolean(row.competition?.reg_url) &&
    row.registration_status !== "registered"
  );
}

export default async function FamilyPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Family
        </h1>
        <p className="mt-3 text-sm text-muted">
          Family accounts are unavailable in this build. You can still search
          public tournament listings while account access is restored.
        </p>
        <Link href="/#search" className="cta-enabled mt-6 inline-flex">
          Search tournaments
        </Link>
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
      const responseCount = upcoming.filter(
        (row) => row.status === "invited"
      ).length;
      const registrationCount = upcoming.filter(needsOrganizerRegistration)
        .length;
      return {
        ...child,
        upcoming,
        responseCount,
        registrationCount,
        actionCount: responseCount + registrationCount,
      };
    })
    .sort(
      (a, b) =>
        b.actionCount - a.actionCount || b.responseCount - a.responseCount
    );

  const totalResponsesNeeded = childrenByPriority.reduce(
    (total, child) => total + child.responseCount,
    0
  );
  const totalRegistrationsNeeded = childrenByPriority.reduce(
    (total, child) => total + child.registrationCount,
    0
  );
  const totalActionsNeeded = totalResponsesNeeded + totalRegistrationsNeeded;
  const firstChildNeedingAction = childrenByPriority.find(
    (child) => child.actionCount > 0
  );

  const rsvpInbox = childrenByPriority.flatMap((child) =>
    child.upcoming
      .filter((row) => row.status === "invited")
      .map((row) => ({ child, row }))
  );
  const registrationInbox = childrenByPriority.flatMap((child) =>
    child.upcoming
      .filter(needsOrganizerRegistration)
      .map((row) => ({ child, row }))
  );

  let missionTitle: string;
  let missionDescription: string;
  let missionAction: { href: string; label: string } | undefined;
  let missionSecondary: { href: string; label: string } | undefined =
    undefined;
  if (!children.length) {
    missionTitle = pendingCount
      ? "Waiting for your student"
      : "Set up your student’s account";
    missionDescription = pendingCount
      ? "Your request is pending. Ask your student to open Plan, then accept the Family request."
      : "Students need their own Causey login on their device. Stay signed in here as the parent, then link after they confirm.";
    missionAction = pendingCount
      ? { href: "#tell-student", label: "What to tell your student" }
      : { href: "#student-account-setup", label: "Set up student account" };
    missionSecondary = pendingCount
      ? undefined
      : {
          href: "#link-student",
          label: "Student already has an account",
        };
  } else if (totalActionsNeeded) {
    const parts: string[] = [];
    if (totalResponsesNeeded) {
      parts.push(
        `${totalResponsesNeeded} ${
          totalResponsesNeeded === 1 ? "RSVP" : "RSVPs"
        }`
      );
    }
    if (totalRegistrationsNeeded) {
      parts.push(
        `${totalRegistrationsNeeded} organizer ${
          totalRegistrationsNeeded === 1 ? "registration" : "registrations"
        }`
      );
    }
    missionTitle = `${parts.join(" and ")} need attention`;
    missionDescription = `Start with ${
      firstChildNeedingAction?.display_name ?? "your student"
    }. RSVPs tell the club who’s coming; organizer registration finishes entry on the tournament site.`;
    missionAction = {
      href: "#needs-response",
      label:
        totalResponsesNeeded > 0 ? "Review actions" : "Finish registrations",
    };
  } else {
    missionTitle = "Your family is caught up";
    missionDescription =
      "No invitations or unfinished organizer registrations need you right now.";
    missionAction = {
      href: profile?.preferred_competition_category
        ? preferredDiscoveryHref(profile.preferred_competition_category)
        : "/#search",
      label: "Search tournaments",
    };
  }

  const linkStudentSection = (
    <section id="link-student" className="mt-12 scroll-mt-24">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
        {pendingCount > 0 ? "Link another student" : "Link a student"}
      </h2>
      {!children.length && !pendingCount ? (
        <p className="mt-2 max-w-prose text-sm text-muted">
          After the student confirms their own account, enter that account email
          below — not your parent email.
        </p>
      ) : null}
      <div className="mt-3 max-w-lg">
        <LinkChildForm />
      </div>
      {pendingCount > 0 ? (
        <div
          id="tell-student"
          className="mt-6 max-w-lg scroll-mt-24 rounded-xl border border-accent/25 bg-accent-soft/40 p-4"
        >
          <p className="text-sm font-semibold text-foreground">
            What to tell your student
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-strong">
            <li>Sign in to Causey with the email you used for the request.</li>
            <li>
              Open <span className="font-semibold text-foreground">Plan</span>{" "}
              in the header.
            </li>
            <li>Accept the Family request near the top of the page.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}{" "}
            until they accept.
          </p>
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Family
          </p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            Who needs you
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Club RSVPs and unfinished organizer registration for each linked
            student land here. Causey RSVP is not organizer entry or payment.
          </p>

          <div className="mt-8">
            <PortalMission
              title={missionTitle}
              description={missionDescription}
              action={missionAction}
              secondary={missionSecondary}
            />
          </div>

          {children.length ? (
            <nav
              aria-label="Family workspace sections"
              className="mt-5 flex gap-2 overflow-x-auto border-b border-line pb-3 lg:hidden"
            >
              {rsvpInbox.length || registrationInbox.length ? (
                <a
                  href="#needs-response"
                  className="min-h-10 shrink-0 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-brand-red"
                >
                  Needs attention
                </a>
              ) : null}
              {childrenByPriority.map((child) => (
                <a
                  key={child.profile_id}
                  href={`#student-${child.profile_id}`}
                  className="min-h-10 shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-foreground"
                >
                  {child.display_name}
                  {child.actionCount ? ` (${child.actionCount})` : ""}
                </a>
              ))}
              <a
                href="#link-student"
                className="min-h-10 shrink-0 px-2 py-2 text-sm font-medium text-muted-strong"
              >
                Link student
              </a>
            </nav>
          ) : null}

          {!children.length ? (
            <>
              {!pendingCount ? <StudentAccountHandoff /> : null}
              {linkStudentSection}
            </>
          ) : null}

          {rsvpInbox.length || registrationInbox.length ? (
            <section id="needs-response" className="mt-10 scroll-mt-24">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                Needs attention
              </h2>
              {rsvpInbox.length ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    RSVPs
                  </h3>
                  <ul className="mt-1">
                    {rsvpInbox.map(({ child, row }) => (
                      <li
                        key={`rsvp-${child.profile_id}-${row.competition_id}`}
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
                </div>
              ) : null}
              {registrationInbox.length ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground">
                    Organizer registration
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Entry and payment happen on the organizer&rsquo;s site.
                    Mark complete here after you finish for your student.
                  </p>
                  <ul className="mt-2">
                    {registrationInbox.map(({ child, row }) => (
                      <li
                        key={`reg-${child.profile_id}-${row.competition_id}`}
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
                            {row.registration_status === "opened" ||
                            row.registration_status === "not_registered"
                              ? " · started, not marked complete"
                              : " · not finished yet"}
                          </span>
                        </div>
                        <FamilyRegistrationActions
                          competitionId={row.competition_id}
                          eventSlug={row.competition!.slug}
                          childProfileId={child.profile_id}
                          childName={child.display_name}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

              {childrenByPriority.map((child) => {
            const answered = child.upcoming.filter(
              (row) =>
                row.status !== "invited" && !needsOrganizerRegistration(row)
            );
            const past = child.entrants.filter(
              (row) =>
                row.competition && !isUpcomingEvent(row.competition, today)
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

                {!child.upcoming.length && !past.length ? (
                  <p className="mt-4 text-sm text-muted">
                    No upcoming tournament invites.
                  </p>
                ) : !child.upcoming.length ? null : answered.length ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-muted-strong">
                      Settled upcoming
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
                          }${
                            row.registration_status === "registered"
                              ? " · organizer registration marked complete"
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

                {past.length ? (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold text-muted-strong">
                      Past
                    </h3>
                    <ul className="mt-1">
                      {past.map((row) => {
                        const recorded = formatRecordedResult({
                          placement: row.placement,
                          awardLabel: row.award_label,
                          sectionName: row.section_name,
                        });
                        return (
                          <PortalListRow
                            key={row.competition_id}
                            href={`/event/${row.competition!.slug}`}
                            title={row.competition!.name}
                            meta={`${formatDateRange(
                              row.competition!.start_date,
                              row.competition!.end_date
                            )} · ${
                              row.status === "attended"
                                ? "Attended"
                                : row.status === "did_not_attend"
                                  ? "Did not attend"
                                  : "Planned"
                            }${
                              recorded
                                ? ` · ${recorded}`
                                : row.status === "attended"
                                  ? " · result not recorded"
                                  : ""
                            }`}
                          />
                        );
                      })}
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
                      {child.actionCount ? (
                        <span className="mt-0.5 block text-xs font-medium text-brand-red">
                          {child.responseCount
                            ? `${child.responseCount} RSVP${
                                child.responseCount === 1 ? "" : "s"
                              }`
                            : ""}
                          {child.responseCount && child.registrationCount
                            ? " · "
                            : ""}
                          {child.registrationCount
                            ? `${child.registrationCount} registration${
                                child.registrationCount === 1 ? "" : "s"
                              }`
                            : ""}
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
