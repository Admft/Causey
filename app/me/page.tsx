import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { ProfileEditor } from "@/components/ProfileEditor";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import type { AccountRole } from "@/lib/auth/types";
import {
  getMyEntrantRows,
  getParentLinks,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Causey profile, saved tournaments, and ratings.",
};

type AccountTournament = {
  slug: string;
  name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string | null;
};

type TournamentPlan = {
  competitionId: string;
  competition: AccountTournament;
  going: boolean;
  registrationMarked: boolean;
};

function addTournamentPlan(
  plans: Map<string, TournamentPlan>,
  competitionId: string,
  competition: AccountTournament,
  signal: "going" | "registered"
) {
  const current = plans.get(competitionId) ?? {
    competitionId,
    competition,
    going: false,
    registrationMarked: false,
  };
  plans.set(competitionId, {
    ...current,
    going: current.going || signal === "going",
    registrationMarked:
      current.registrationMarked || signal === "registered",
  });
}

const ROLE_NEXT_ACTION: Record<
  AccountRole,
  {
    title: string;
    description: string;
    href: string;
    label: string;
    secondary?: { href: string; label: string };
  }
> = {
  student: {
    title: "Find your next chess tournament",
    description:
      "Search scholastic events, save the ones that fit, and keep your club invitations together.",
    href: "/chess",
    label: "Search tournaments",
    secondary: { href: "/orgs", label: "Open my clubs" },
  },
  parent: {
    title: "See which student needs you",
    description:
      "Review each linked student’s clubs, tournament invitations, and RSVP status.",
    href: "/family",
    label: "Review family activity",
  },
  coach: {
    title: "Run your next team task",
    description:
      "Open your organization workspace to manage rosters, invitations, and tournaments.",
    href: "/orgs",
    label: "Manage organizations",
  },
};

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Profile not ready
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your login works, but the profiles table is missing or the signup
          trigger didn&rsquo;t run. Apply{" "}
          <code className="text-foreground">supabase/migrations/0009_accounts.sql</code>{" "}
          in the Supabase SQL editor, then sign out and back in.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [
    { data: savedRows },
    { data: ratingRows },
    { data: registrationRows },
    parentLinks,
    entrantRows,
  ] = await Promise.all([
    supabase
      .from("saved_competitions")
      .select(
        "competition_id, created_at, competitions(id, slug, name, city, state, start_date, end_date)"
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("competition_ratings")
      .select("score, competitions(id, slug, name)")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("external_registrations")
      .select(
        "competition_id, status, opened_at, competitions(id, slug, name, city, state, start_date, end_date)"
      )
      .eq("user_id", profile.id)
      .order("opened_at", { ascending: false }),
    profile.role === "student"
      ? getParentLinks(profile.id)
      : Promise.resolve([]),
    getMyEntrantRows(profile.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const registrationEvents = (registrationRows ?? [])
    .flatMap((row) => {
      const competition =
        row.competitions as unknown as AccountTournament | null;
      if (!competition) return [];
      return [
        {
          competitionId: row.competition_id as string,
          status: row.status as "opened" | "registered" | "not_registered",
          competition,
        },
      ];
    })
    .sort((a, b) =>
      a.competition.start_date.localeCompare(b.competition.start_date)
    );
  const registrationNeeded = registrationEvents.filter(
    (row) =>
      row.status !== "registered" &&
      isUpcomingEvent(row.competition, today)
  );
  const upcomingInvitations = entrantRows.filter(
    (row) =>
      row.status === "invited" &&
      row.competition &&
      isUpcomingEvent(row.competition, today)
  );
  const plans = new Map<string, TournamentPlan>();
  for (const row of entrantRows) {
    if (row.status === "going" && row.competition) {
      addTournamentPlan(
        plans,
        row.competition_id,
        row.competition,
        "going"
      );
    }
  }
  for (const row of registrationEvents) {
    if (row.status === "registered") {
      addTournamentPlan(
        plans,
        row.competitionId,
        row.competition,
        "registered"
      );
    }
  }
  const registrationNeededIds = new Set(
    registrationNeeded.map((row) => row.competitionId)
  );
  const upcomingPlans = [...plans.values()]
    .filter(
      (plan) =>
        isUpcomingEvent(plan.competition, today) &&
        !registrationNeededIds.has(plan.competitionId)
    )
    .sort((a, b) =>
      a.competition.start_date.localeCompare(b.competition.start_date)
    );
  const pastPlans = [...plans.values()]
    .filter((plan) => !isUpcomingEvent(plan.competition, today))
    .sort((a, b) =>
      b.competition.start_date.localeCompare(a.competition.start_date)
    );
  const hasTournamentWorkspace =
    upcomingInvitations.length > 0 ||
    registrationNeeded.length > 0 ||
    upcomingPlans.length > 0 ||
    pastPlans.length > 0;
  const planStatus = (plan: TournamentPlan, past: boolean) =>
    plan.going && plan.registrationMarked
      ? past
        ? "Planned to go · You marked registration complete"
        : "Going · You marked registration complete"
      : plan.going
        ? past
          ? "You planned to go"
          : "Going"
        : "You marked registration complete";

  const roleLabel =
    profile.role === "coach"
      ? "Coach / Organizer"
      : profile.role === "parent"
        ? "Parent"
        : "Student";
  const nextAction = ROLE_NEXT_ACTION[profile.role];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {profile.display_name || "Your profile"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {user.email} · {roleLabel}
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">
          {nextAction.title}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {nextAction.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href={nextAction.href} className="cta-enabled inline-flex">
            {nextAction.label}
          </Link>
          {nextAction.secondary ? (
            <Link
              href={nextAction.secondary.href}
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              {nextAction.secondary.label}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">
          My tournaments
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Answer invitations, finish organizer-site registration, and keep
          upcoming and past plans in one place.
        </p>
        {!hasTournamentWorkspace ? (
          <p className="mt-4 text-sm text-muted">
            You don&rsquo;t have tournament plans yet.{" "}
            <Link href="/chess" className="font-semibold text-brand-red hover:underline">
              Search tournaments
            </Link>
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-7">
            {upcomingInvitations.length ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-strong">
                  Invited
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Your coach needs to know whether you can attend.
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  {upcomingInvitations.map((row) => (
                    <li
                      key={row.competition_id}
                      className="rounded-xl border border-line bg-surface px-4 py-3"
                    >
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
                      <div className="mt-3">
                        <RsvpButtons
                          competitionId={row.competition_id}
                          profileId={profile.id}
                          status={row.status}
                          eventSlug={row.competition!.slug}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {registrationNeeded.length ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-strong">
                  Registration needed
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {registrationNeeded.map(({ competitionId, competition }) => (
                    <li key={competitionId}>
                      <Link
                        href={`/event/${competition.slug}`}
                        className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-red/30"
                      >
                        <span className="font-semibold text-foreground">
                          {competition.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {formatDateRange(
                            competition.start_date,
                            competition.end_date
                          )}{" "}
                          · {competition.city}, {competition.state}
                        </span>
                        <span className="mt-2 block text-sm font-semibold text-brand-red">
                          Finish registration
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {upcomingPlans.length ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-strong">
                  Upcoming
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {upcomingPlans.map((plan) => (
                    <li key={plan.competitionId}>
                      <Link
                        href={`/event/${plan.competition.slug}`}
                        className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-red/30"
                      >
                        <span className="font-semibold text-foreground">
                          {plan.competition.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {formatDateRange(
                            plan.competition.start_date,
                            plan.competition.end_date
                          )}
                          {plan.competition.city
                            ? ` · ${plan.competition.city}, ${plan.competition.state}`
                            : ""}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-muted-strong">
                          {planStatus(plan, false)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {pastPlans.length ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-strong">
                  Past
                </h3>
                <p className="mt-1 text-sm text-muted">
                  A history of plans you made in Causey. This does not confirm
                  attendance or payment.
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  {pastPlans.map((plan) => (
                    <li key={plan.competitionId}>
                      <Link
                        href={`/event/${plan.competition.slug}`}
                        className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-red/30"
                      >
                        <span className="font-semibold text-foreground">
                          {plan.competition.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {formatDateRange(
                            plan.competition.start_date,
                            plan.competition.end_date
                          )}
                          {plan.competition.city
                            ? ` · ${plan.competition.city}, ${plan.competition.state}`
                            : ""}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-muted-strong">
                          {planStatus(plan, true)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {parentLinks.length ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="text-sm font-semibold text-foreground">Family</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {parentLinks.map((link) => (
              <li
                key={link.parent_profile_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {link.parent_name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {link.status === "pending"
                      ? "wants to link as your parent — they’ll see your clubs and can RSVP for you"
                      : "linked as your parent"}
                  </span>
                </div>
                <HouseholdRequestActions
                  parentProfileId={link.parent_profile_id}
                  linked={link.status === "active"}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="mt-4">
          <ProfileEditor profile={profile} />
        </div>
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Saved tournaments</h2>
        {!savedRows?.length ? (
          <p className="mt-3 text-sm text-muted">
            None yet. Open an event and tap{" "}
            <span className="font-medium text-foreground">Save to profile</span>.{" "}
            <Link href="/chess" className="font-semibold text-brand-red hover:underline">
              Search tournaments
            </Link>
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {savedRows.map((row) => {
              const c = row.competitions as unknown as {
                slug: string;
                name: string;
                city: string;
                state: string;
                start_date: string;
                end_date: string | null;
              } | null;
              if (!c) return null;
              return (
                <li key={row.competition_id}>
                  <Link
                    href={`/event/${c.slug}`}
                    className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-red/30"
                  >
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {formatDateRange(c.start_date, c.end_date)} · {c.city}, {c.state}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Your difficulty ratings</h2>
        {!ratingRows?.length ? (
          <p className="mt-3 text-sm text-muted">
            Rate how hard an event feels (1–10) from its event page.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {ratingRows.map((row) => {
              const c = row.competitions as unknown as {
                slug: string;
                name: string;
              } | null;
              if (!c) return null;
              return (
                <li key={c.slug} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/event/${c.slug}`} className="font-medium text-foreground hover:text-brand-red">
                    {c.name}
                  </Link>
                  <span className="shrink-0 font-semibold text-muted-strong">{row.score}/10</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
