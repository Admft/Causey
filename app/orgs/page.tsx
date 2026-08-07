import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissRecommendationButton } from "@/components/DismissRecommendationButton";
import { JoinOrgForm } from "@/components/JoinOrgForm";
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

export default async function OrgsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Organizations
        </h1>
        <p className="mt-3 text-sm text-muted">
          Connect Supabase (set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env) to use accounts and
          organizations.
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orgs");
  const profile = await getCurrentProfile();
  if (profile?.role === "parent") redirect("/family");
  const isCoachRole = canCreateOrg(profile);

  const [myOrgs, entrantRows, recommendations] = await Promise.all([
    getMyOrgs(user.id),
    getMyEntrantRows(user.id),
    getMyRecommendations(user.id),
  ]);
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
  const primaryOrg = coachedOrgs[0] ?? myOrgs[0];
  const primaryNeedsStudents =
    isCoachRole &&
    primaryOrg?.isCoach &&
    primaryOrg.org.type !== "district"
      ? (
          await getOrgRoster(primaryOrg.org.id)
        ).filter(
          (row) =>
            row.member_status === "active" && row.member_role === "student"
        ).length === 0
      : false;

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
      {isCoachRole ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Coach mission
          </p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            What to run next
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Open the organization that needs work. Your directory stays below.
          </p>

          <div className="mt-8">
            <PortalMission
              title={
                !myOrgs.length
                  ? "Start your first organization"
                  : primaryNeedsStudents && primaryOrg
                    ? `Invite students to ${primaryOrg.org.name}`
                    : primaryOrg
                      ? `Continue with ${primaryOrg.org.name}`
                      : "Open an organization"
              }
              description={
                !myOrgs.length
                  ? "Create a school or club workspace to get a join code, roster, and tournament tools."
                  : primaryNeedsStudents
                    ? "Your roster is empty. Share a join link so students can join before you create tournaments."
                    : pendingInviteCount
                      ? `You also have ${pendingInviteCount} personal ${
                          pendingInviteCount === 1
                            ? "invitation"
                            : "invitations"
                        } waiting — answer those after org work, or jump to them below.`
                      : "Rosters, invites, and tournaments live inside each organization workspace."
              }
              action={
                !myOrgs.length
                  ? { href: "/orgs/new", label: "Start an organization" }
                  : primaryNeedsStudents && primaryOrg
                    ? {
                        href: `/orgs/${primaryOrg.org.slug}/roster#add-students`,
                        label: "Open roster",
                      }
                    : primaryOrg
                      ? {
                          href: `/orgs/${primaryOrg.org.slug}`,
                          label: "Open workspace",
                        }
                      : undefined
              }
              secondary={
                pendingInviteCount
                  ? { href: "#rsvps", label: "Review my RSVPs" }
                  : primaryNeedsStudents && primaryOrg
                    ? {
                        href: `/orgs/${primaryOrg.org.slug}`,
                        label: "Open workspace",
                      }
                    : myOrgs.length
                      ? { href: "/orgs/new", label: "Start another" }
                      : undefined
              }
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Clubs
          </p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            Your clubs
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Join with the code your coach shared. Tournament RSVPs live on{" "}
            <Link href="/me" className="font-semibold text-brand-red hover:underline">
              My tournaments
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
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            {isCoachRole ? "Organizations" : "Where you belong"}
          </h2>
          {isCoachRole && myOrgs.length ? (
            <Link
              href="/orgs/new"
              className="text-sm font-semibold text-brand-red hover:underline"
            >
              Start another
            </Link>
          ) : null}
        </div>

        {!myOrgs.length ? (
          isCoachRole ? (
            <p className="mt-3 text-sm text-muted">
              No organizations yet — use the mission above to start one.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              You haven&rsquo;t joined an organization yet.
            </p>
          )
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {myOrgs.map(({ org, isCoach }) => (
              <li key={org.id}>
                <Link
                  href={`/orgs/${org.slug}`}
                  className="card-lift block h-full rounded-xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow-card)]"
                >
                  <span className="font-semibold text-foreground">{org.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {ORG_TYPE_LABEL[org.type] ?? org.type}
                    {org.state ? ` · ${org.state}` : ""}
                    {isCoach ? " · you coach here" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isCoachRole ? (
        <section id="join-code" className="mt-10 scroll-mt-24">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            Join with a code
          </h2>
          <div className="mt-4 max-w-md">
            <JoinOrgForm />
          </div>
        </section>
      ) : null}

      {upcomingInvites.length || (!isCoachRole && !pendingInviteCount)
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
