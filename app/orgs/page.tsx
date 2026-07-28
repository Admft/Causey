import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinOrgForm } from "@/components/JoinOrgForm";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  getMyEntrantRows,
  getMyOrgs,
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
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold text-foreground">
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
  const isCoachRole = canCreateOrg(profile);

  const [myOrgs, entrantRows] = await Promise.all([
    getMyOrgs(user.id),
    getMyEntrantRows(user.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingInvites = entrantRows.filter(
    (row) => row.competition && isUpcomingEvent(row.competition, today)
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Organizations</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {isCoachRole ? "Your organizations" : "Your clubs"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isCoachRole
          ? "Run rosters, share join codes, and host tournaments."
          : "Join your school or club with the code your coach shared."}
      </p>

      <section className="section-rule mt-10 pt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {isCoachRole ? "Organizations you run or belong to" : "Where you belong"}
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
            <div className="mt-4">
              <p className="text-sm text-muted">
                No organizations yet. Start one for your school or club — you
                get a join code to share with students right away.
              </p>
              <Link href="/orgs/new" className="cta-enabled mt-4 inline-flex">
                Start an organization
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              You haven&rsquo;t joined an organization yet. Ask your coach for
              a join code and enter it below.
            </p>
          )
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {myOrgs.map(({ org, isCoach }) => (
              <li key={org.id}>
                <Link
                  href={`/orgs/${org.slug}`}
                  className="card-lift block rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
                >
                  <span className="font-semibold text-foreground">{org.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {ORG_TYPE_LABEL[org.type] ?? org.type}
                    {org.state ? ` · ${org.state}` : ""}
                    {isCoach ? " · you coach this organization" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {isCoachRole && myOrgs.length ? (
          <div className="mt-5">
            <Link href="/orgs/new" className="cta-enabled inline-flex">
              Start an organization
            </Link>
          </div>
        ) : null}
      </section>

      {!isCoachRole ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Join with a code</h2>
          <div className="mt-4">
            <JoinOrgForm />
          </div>
        </section>
      ) : null}

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">
          Invitations &amp; RSVPs
        </h2>
        {!upcomingInvites.length ? (
          <p className="mt-3 text-sm text-muted">
            When your coach invites you to a tournament, it shows up here for
            you to RSVP.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {upcomingInvites.map((row) => (
              <li
                key={`${row.competition_id}-${row.profile_id}`}
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

      {profile?.role === "parent" ? (
        <p className="mt-8 text-sm text-muted">
          Looking for your child&rsquo;s clubs and events?{" "}
          <Link href="/family" className="font-semibold text-brand-red hover:underline">
            Go to Family
          </Link>
        </p>
      ) : null}
    </div>
  );
}
