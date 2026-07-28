import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkChildForm } from "@/components/LinkChildForm";
import { RsvpButtons } from "@/components/RsvpButtons";
import { UnlinkChildButton } from "@/components/UnlinkChildButton";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  getChildrenWithEvents,
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
        <h1 className="font-display text-display-lg font-bold text-foreground">
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

  const [children, pendingCount] = await Promise.all([
    getChildrenWithEvents(user.id),
    getPendingChildRequestCount(user.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);

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

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Link a child</h2>
        <div className="mt-4">
          <LinkChildForm />
        </div>
        {pendingCount > 0 ? (
          <p className="mt-3 text-sm text-muted-strong">
            {pendingCount} pending{" "}
            {pendingCount === 1 ? "request" : "requests"} — waiting for your
            student to accept from their account page.
          </p>
        ) : null}
      </section>

      {!children.length ? (
        <section className="section-rule mt-10 pt-8">
          <p className="text-sm text-muted">
            No linked students yet. Once your child accepts, their clubs and
            tournament invites show up here.
          </p>
        </section>
      ) : (
        children.map((child) => {
          const upcoming = child.entrants.filter(
            (row) => row.competition && isUpcomingEvent(row.competition, today)
          );
          return (
            <section key={child.profile_id} className="section-rule mt-10 pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-display-sm font-bold text-foreground">
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

              {!upcoming.length ? (
                <p className="mt-4 text-sm text-muted">
                  No upcoming tournament invites.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {upcoming.map((row) => (
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
    </div>
  );
}
