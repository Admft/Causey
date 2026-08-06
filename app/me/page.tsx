import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your plan",
  description: "Your Causey tournament invitations, registration, and profile.",
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
      "Search scholastic events, save the ones that fit, and keep club invitations here.",
    href: "/chess",
    label: "Search tournaments",
    secondary: { href: "/orgs", label: "Open my clubs" },
  },
  parent: {
    title: "See which student needs you",
    description:
      "Your parent desk shows each linked student’s invitations and RSVP status.",
    href: "/family",
    label: "Open family desk",
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
  const actionCount = upcomingInvitations.length + registrationNeeded.length;
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
  const isStudent = profile.role === "student";
  const nextAction = ROLE_NEXT_ACTION[profile.role];
  const studentMission =
    actionCount > 0
      ? {
          title:
            upcomingInvitations.length > 0
              ? `${upcomingInvitations.length} ${
                  upcomingInvitations.length === 1 ? "invite needs" : "invites need"
                } your RSVP`
              : `${registrationNeeded.length} ${
                  registrationNeeded.length === 1
                    ? "registration is"
                    : "registrations are"
                } unfinished`,
          description:
            upcomingInvitations.length > 0
              ? "Tell your coach whether you can attend, then finish any organizer registration still open."
              : "Finish registration and payment on each organizer’s site, then mark it complete here.",
          action: {
            href: "#plan",
            label:
              upcomingInvitations.length > 0
                ? "Answer invitations"
                : "Finish registration",
          },
          secondary: { href: "/chess", label: "Search more tournaments" },
        }
      : {
          title: nextAction.title,
          description: nextAction.description,
          action: { href: nextAction.href, label: nextAction.label },
          secondary: nextAction.secondary,
        };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      {isStudent ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            Student plan
          </p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            Your tournaments
          </h1>
          <p className="mt-2 text-sm text-muted">
            {profile.display_name || "Your profile"} · {user.email}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-brand-red">Account</p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            {profile.display_name || "Your profile"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user.email} · {roleLabel}
          </p>
        </>
      )}

      <div className="mt-8">
        <PortalMission
          title={isStudent ? studentMission.title : nextAction.title}
          description={
            isStudent ? studentMission.description : nextAction.description
          }
          action={
            isStudent
              ? studentMission.action
              : { href: nextAction.href, label: nextAction.label }
          }
          secondary={
            isStudent ? studentMission.secondary : nextAction.secondary
          }
        />
      </div>

      <section id="plan" className="mt-10 scroll-mt-24">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
          {isStudent ? "Plan" : "My tournaments"}
        </h2>
        {!isStudent ? (
          <p className="mt-2 max-w-prose text-sm text-muted">
            Answer invitations, finish organizer registration, and keep
            upcoming and past plans in one place.
          </p>
        ) : null}
        {!hasTournamentWorkspace ? (
          <p className="mt-4 text-sm text-muted">
            You don&rsquo;t have tournament plans yet.{" "}
            <Link href="/chess" className="font-semibold text-brand-red hover:underline">
              Search tournaments
            </Link>
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-8">
            {upcomingInvitations.length ? (
              <div>
                <h3 className="text-sm font-semibold text-brand-red">
                  Invited — needs your RSVP
                </h3>
                <ul className="mt-2">
                  {upcomingInvitations.map((row) => (
                    <li
                      key={row.competition_id}
                      className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0"
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
                        profileId={profile.id}
                        status={row.status}
                        eventSlug={row.competition!.slug}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {registrationNeeded.length ? (
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Organizer registration needed
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Finish registration and payment on each organizer&rsquo;s
                  site, then mark it complete on Causey.
                </p>
                <ul className="mt-2">
                  {registrationNeeded.map(({ competitionId, competition }) => (
                    <PortalListRow
                      key={competitionId}
                      href={`/event/${competition.slug}`}
                      title={competition.name}
                      meta={`${formatDateRange(
                        competition.start_date,
                        competition.end_date
                      )} · ${competition.city}, ${competition.state}`}
                      trailing={
                        <span className="text-sm font-semibold text-brand-red">
                          Finish registration
                        </span>
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {upcomingPlans.length ? (
              <div>
                <h3 className="text-sm font-semibold text-muted-strong">
                  Upcoming
                </h3>
                <ul className="mt-2">
                  {upcomingPlans.map((plan) => (
                    <PortalListRow
                      key={plan.competitionId}
                      href={`/event/${plan.competition.slug}`}
                      title={plan.competition.name}
                      meta={`${formatDateRange(
                        plan.competition.start_date,
                        plan.competition.end_date
                      )}${
                        plan.competition.city
                          ? ` · ${plan.competition.city}, ${plan.competition.state}`
                          : ""
                      } · ${planStatus(plan, false)}`}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {pastPlans.length ? (
              <div>
                <h3 className="text-sm font-semibold text-muted-strong">
                  Past
                </h3>
                <p className="mt-1 text-sm text-muted">
                  History of plans you made in Causey — not confirmed attendance
                  or payment.
                </p>
                <ul className="mt-2">
                  {pastPlans.map((plan) => (
                    <PortalListRow
                      key={plan.competitionId}
                      href={`/event/${plan.competition.slug}`}
                      title={plan.competition.name}
                      meta={`${formatDateRange(
                        plan.competition.start_date,
                        plan.competition.end_date
                      )}${
                        plan.competition.city
                          ? ` · ${plan.competition.city}, ${plan.competition.state}`
                          : ""
                      } · ${planStatus(plan, true)}`}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {parentLinks.length ? (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            Family
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
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

      <details className="mt-12 border-t border-line pt-8">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-strong">
          Profile &amp; saved items
        </summary>
        <div className="mt-6 flex flex-col gap-10">
          <section>
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            <div className="mt-4">
              <ProfileEditor profile={profile} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">
              Saved tournaments
            </h2>
            {!savedRows?.length ? (
              <p className="mt-3 text-sm text-muted">
                None yet. Open an event and tap{" "}
                <span className="font-medium text-foreground">Save to profile</span>.
              </p>
            ) : (
              <ul className="mt-3">
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
                    <PortalListRow
                      key={row.competition_id}
                      href={`/event/${c.slug}`}
                      title={c.name}
                      meta={`${formatDateRange(c.start_date, c.end_date)} · ${c.city}, ${c.state}`}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">
              Your difficulty ratings
            </h2>
            {!ratingRows?.length ? (
              <p className="mt-3 text-sm text-muted">
                Rate how hard an event feels (1–10) from its event page.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {ratingRows.map((row) => {
                  const c = row.competitions as unknown as {
                    slug: string;
                    name: string;
                  } | null;
                  if (!c) return null;
                  return (
                    <li
                      key={c.slug}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <Link
                        href={`/event/${c.slug}`}
                        className="font-medium text-foreground hover:text-brand-red"
                      >
                        {c.name}
                      </Link>
                      <span className="shrink-0 font-semibold text-muted-strong">
                        {row.score}/10
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}
