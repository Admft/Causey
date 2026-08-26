import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissRecommendationButton } from "@/components/DismissRecommendationButton";
import { JoinOrgForm } from "@/components/JoinOrgForm";
import { MissingZipCard } from "@/components/MissingZipCard";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  getMyEntrantRows,
  getMyOrgs,
  getMyRecommendations,
  getOrgRoster,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { canCreateOrg } from "@/lib/org-permissions";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your organizations",
  description: "Clubs and schools you belong to on Causey, plus your invites.",
};

const ORG_TYPE_LABEL: Record<string, string> = {
  school: "School",
  club: "Club",
  team: "Team",
  district: "District",
};

function staffRoleLabel(
  memberRole: string | null,
  isCoach: boolean
): string | null {
  if (memberRole === "district_admin") return "district admin";
  if (memberRole === "school_admin" || memberRole === "admin") {
    return "admin";
  }
  if (memberRole === "assistant_coach") return "assistant coach";
  if (memberRole === "coach" || isCoach) return "coach";
  return null;
}

export default async function OrgsPage({
  searchParams,
}: {
  searchParams?: Promise<{ left?: string }>;
}) {
  const leftClub = (await searchParams)?.left === "1";
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Organizations
        </h1>
        <p className="mt-3 text-sm text-muted">
          Organization workspaces are unavailable in this build. You can still
          search public tournament listings while account access is restored.
        </p>
        <Link href="/#search" className="cta-enabled mt-6 inline-flex">
          Search tournaments
        </Link>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orgs");
  const profile = await getCurrentProfile();
  const canStartOrganization = canCreateOrg(profile);

  const [myOrgs, entrantRows, recommendations] = await Promise.all([
    getMyOrgs(user.id),
    getMyEntrantRows(user.id),
    getMyRecommendations(user.id),
  ]);
  const hasStaffMembership = myOrgs.some(({ isCoach }) => isCoach);
  const isStaffWorkspace =
    profile?.role === "coach" || hasStaffMembership;
  if (profile?.role === "parent" && !hasStaffMembership) redirect("/family");
  const today = new Date().toISOString().slice(0, 10);
  const upcomingInvites = entrantRows
    .filter((row) => row.competition && isUpcomingEvent(row.competition, today))
    .sort((a, b) => {
      if (a.status === b.status) {
        return (a.competition?.start_date ?? "").localeCompare(
          b.competition?.start_date ?? ""
        );
      }
      return a.status === "invited" ? -1 : 1;
    });
  const pendingInviteCount = upcomingInvites.filter(
    (row) => row.status === "invited"
  ).length;
  const coachedOrgs = myOrgs.filter(({ isCoach }) => isCoach);
  const districtOrg = coachedOrgs.find(({ org, memberRole }) =>
    Boolean(org.type === "district" && (memberRole === "district_admin" || isStaffWorkspace))
  );
  const hasDistrictWorkspace = Boolean(districtOrg);
  const staffOrgsNeedingStudents = new Set<string>();
  if (isStaffWorkspace) {
    await Promise.all(
      coachedOrgs
        .filter(({ org }) => org.type !== "district")
        .map(async ({ org }) => {
          const students = (await getOrgRoster(org.id)).filter(
            (row) =>
              row.member_status === "active" && row.member_role === "student"
          );
          if (!students.length) staffOrgsNeedingStudents.add(org.id);
        })
    );
  }
  const sortedOrgs = [...myOrgs].sort((a, b) => {
    if (a.org.type === "district" && b.org.type !== "district") return -1;
    if (b.org.type === "district" && a.org.type !== "district") return 1;
    const aNeeds = staffOrgsNeedingStudents.has(a.org.id) ? 0 : 1;
    const bNeeds = staffOrgsNeedingStudents.has(b.org.id) ? 0 : 1;
    if (aNeeds !== bNeeds) return aNeeds - bNeeds;
    return a.org.name.localeCompare(b.org.name);
  });
  const primaryOrg =
    districtOrg ??
    sortedOrgs.find(({ org, isCoach }) =>
      Boolean(isCoach && staffOrgsNeedingStudents.has(org.id))
    ) ??
    coachedOrgs[0] ??
    myOrgs[0];
  const primaryNeedsStudents = Boolean(
    primaryOrg && staffOrgsNeedingStudents.has(primaryOrg.org.id)
  );

  const invitationsSection = (
    <section id="rsvps" className="mt-10 scroll-mt-24">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
        {pendingInviteCount
          ? `${pendingInviteCount} ${
              pendingInviteCount === 1 ? "RSVP needs" : "RSVPs need"
            } your response`
          : "Your invitations"}
      </h2>
      {!upcomingInvites.length ? (
        <p className="mt-3 text-sm text-muted">
          When a coach invites you to a tournament, it shows up here.
        </p>
      ) : (
        <ul className="mt-2">
          {upcomingInvites.map((row) => (
            <li
              key={`${row.competition_id}-${row.profile_id}`}
              className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
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
                </span>
              </div>
              <RsvpButtons
                competitionId={row.competition_id}
                profileId={row.profile_id}
                status={row.status}
                eventSlug={row.competition!.slug}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      {leftClub ? (
        <p
          className="mb-6 rounded-xl border border-accent/25 bg-accent-soft p-4 text-sm text-foreground"
          role="status"
        >
          You left that club. Join another with a code below, or{" "}
          <Link href="/me" className="font-semibold text-brand-red hover:underline">
            open Plan
          </Link>
          .
        </p>
      ) : null}
      {profile && !profile.zip ? (
        <div className="mb-6">
          <MissingZipCard />
        </div>
      ) : null}
      {isStaffWorkspace ? (
        <>
          <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
            {hasDistrictWorkspace ? "Districts and schools" : "Your organizations"}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            {!myOrgs.length
              ? canStartOrganization
                ? "Create a school or club to get a join link, roster, and tournament tools."
                : "Ask an administrator for a staff invitation, then come back here."
              : hasDistrictWorkspace && districtOrg
                ? `Open ${districtOrg.org.name} to provision schools, complete administrator handoffs, and review aggregate participation.`
              : primaryNeedsStudents && primaryOrg
                ? `${primaryOrg.org.name} has an empty roster. Invite students before you create tournaments.`
                : "Rosters, invites, and tournaments live inside each workspace."}
          </p>

          {/* Empty state only — when orgs exist, the directory rows carry the CTA. */}
          {!myOrgs.length ? (
            <div className="mt-8">
              <PortalMission
                title={
                  canStartOrganization
                    ? "Start your first organization"
                    : "No organization access yet"
                }
                description={
                  canStartOrganization
                    ? "You’ll get a join link for students and a place to publish club tournaments."
                    : "Staff invitations come from an organization administrator."
                }
                action={
                  canStartOrganization
                    ? { href: "/orgs/new", label: "Start an organization" }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {primaryNeedsStudents && primaryOrg ? (
                <>
                  <Link
                    href={`/orgs/${primaryOrg.org.slug}/roster#add-students`}
                    className="cta-enabled inline-flex"
                  >
                    Invite students
                  </Link>
                  <Link
                    href={`/orgs/${primaryOrg.org.slug}`}
                    className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                  >
                    Open workspace
                  </Link>
                </>
              ) : primaryOrg ? (
                <Link
                  href={`/orgs/${primaryOrg.org.slug}`}
                  className="cta-enabled inline-flex"
                >
                  {primaryOrg.org.type === "district"
                    ? "Open district workspace"
                    : "Open workspace"}
                </Link>
              ) : null}
              {pendingInviteCount ? (
                <Link
                  href="#rsvps"
                  className="text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Review my RSVPs
                </Link>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
            Your clubs
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Join with the code your coach shared. RSVPs and organizer
            registration follow-through live on{" "}
            <Link
              href="/me"
              className="font-semibold text-brand-red hover:underline"
            >
              Plan
            </Link>
            .
          </p>

          <div className="mt-8">
            <PortalMission
              title={
                pendingInviteCount
                  ? `${pendingInviteCount} ${
                      pendingInviteCount === 1 ? "invite needs" : "invites need"
                    } your RSVP`
                  : myOrgs.length
                    ? "You’re on a roster"
                    : "Join your school or club"
              }
              description={
                pendingInviteCount
                  ? "Answer on your tournament plan, then come back here for club codes and membership."
                  : myOrgs.length
                    ? "Open a club to see teammates and public org pages. Use a join code to add another."
                    : "Ask your coach for a join code and enter it below."
              }
              action={
                pendingInviteCount
                  ? { href: "/me#plan", label: "Open my tournaments" }
                  : myOrgs.length
                    ? {
                        href: `/orgs/${myOrgs[0].org.slug}`,
                        label: "Open club",
                      }
                    : { href: "#join-code", label: "Enter a join code" }
              }
              secondary={
                pendingInviteCount
                  ? { href: "#join-code", label: "Join another club" }
                  : { href: "/me", label: "Back to my tournaments" }
              }
            />
          </div>
        </>
      )}

      <section id="organizations" className="mt-10 scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground">
          {isStaffWorkspace
            ? hasDistrictWorkspace
              ? "Districts, schools, and clubs"
              : "All organizations"
            : "Where you belong"}
        </h2>

        {!myOrgs.length ? (
          <p className="mt-3 text-sm text-muted">
            {isStaffWorkspace
              ? "None yet — use the next step above."
              : "You haven’t joined an organization yet."}
          </p>
        ) : (
          <ul className="mt-2">
            {sortedOrgs.map(({ org, isCoach, memberRole }) => {
              const role = staffRoleLabel(memberRole, isCoach);
              const needsStudents = staffOrgsNeedingStudents.has(org.id);
              const meta = [
                ORG_TYPE_LABEL[org.type] ?? org.type,
                org.state,
                role ? `your role: ${role}` : null,
                needsStudents ? "empty roster" : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <PortalListRow
                  key={org.id}
                  href={`/orgs/${org.slug}`}
                  title={org.name}
                  meta={meta}
                  trailing={
                    needsStudents ? (
                      <Link
                        href={`/orgs/${org.slug}/roster#add-students`}
                        className="shrink-0 text-sm font-semibold text-brand-red hover:underline"
                      >
                        Invite students
                      </Link>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="nudge-x hidden text-muted sm:inline"
                      >
                        →
                      </span>
                    )
                  }
                />
              );
            })}
          </ul>
        )}

        {isStaffWorkspace && canStartOrganization ? (
          <p className="mt-4">
            <Link
              href="/orgs/new"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              {myOrgs.length
                ? "Start another organization"
                : "Start an organization"}
            </Link>
          </p>
        ) : null}
      </section>

      {!isStaffWorkspace ? (
        <section id="join-code" className="mt-10 scroll-mt-24">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            Join with a code
          </h2>
          <div className="mt-4 max-w-md">
            <JoinOrgForm />
          </div>
        </section>
      ) : null}

      {upcomingInvites.length || (!isStaffWorkspace && !pendingInviteCount)
        ? invitationsSection
        : null}

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
  );
}
