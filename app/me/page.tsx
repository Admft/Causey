import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { MissingZipCard } from "@/components/MissingZipCard";
import { PortalListRow, PortalMission } from "@/components/PortalPrimitives";
import { RsvpButtons } from "@/components/RsvpButtons";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import type { AccountRole } from "@/lib/auth/types";
import { preferredDiscoveryHref } from "@/lib/category-discovery";
import {
  getMyEntrantRows,
  getMyOrgs,
  getParentLinks,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateRange, formatRecordedResult } from "@/lib/format";
import { studentOrgChromeFromTypes } from "@/lib/portal-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plan",
  description:
    "Your Causey invitations, RSVPs, and organizer registration follow-through.",
};

type AccountTournament = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
};

type TournamentPlan = {
  competitionId: string;
  competition: AccountTournament;
  going: boolean;
  registrationMarked: boolean;
};

function formatTournamentMeta(competition: AccountTournament): string {
  const location = [competition.city, competition.state]
    .filter(Boolean)
    .join(", ");
  return `${formatDateRange(competition.start_date, competition.end_date)}${
    location ? ` · ${location}` : ""
  }`;
}

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
    title: "Join your school or club",
    description:
      "Ask your coach for a join link or code. School and club invitations and RSVPs show up here after you join.",
    href: "/orgs",
    label: "Open my organizations",
    // Filled in per account below so the shortcut follows the saved category.
    secondary: { href: "/#search", label: "Search tournaments" },
  },
  parent: {
    title: "See which student needs you",
    description:
      "Your parent desk shows each linked student’s invitations and RSVP status.",
    href: "/family",
    label: "Open family desk",
  },
  coach: {
    title: "Run your next club task",
    description:
      "Open your club workspace to manage rosters, invitations, and competitions.",
    href: "/orgs",
    label: "Open my clubs",
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
          You&rsquo;re signed in, but Causey could not finish loading your
          profile. Sign out and back in once. If this continues, ask the person
          who manages your Causey access for help.
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
    myOrgs,
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
    profile.role === "student" ? getMyOrgs(profile.id) : Promise.resolve([]),
  ]);
  const pendingParentLinks = parentLinks.filter(
    (link) => link.status === "pending"
  );

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
    if (
      row.status === "attended" &&
      row.competition &&
      !isUpcomingEvent(row.competition, today)
    ) {
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

  const isStudent = profile.role === "student";
  const nextAction = ROLE_NEXT_ACTION[profile.role];
  const orgChrome = studentOrgChromeFromTypes(myOrgs.map(({ org }) => org.type));
  // Generic discovery links follow the account's saved directory shortcut;
  // without one they land on the homepage chooser instead of chess.
  const searchHref = profile.preferred_competition_category
    ? preferredDiscoveryHref(profile.preferred_competition_category)
    : "/#search";
  const searchAction = { href: searchHref, label: "Search tournaments" };
  const studentMission =
    pendingParentLinks.length > 0
      ? {
          title:
            pendingParentLinks.length === 1
              ? "A parent wants to link"
              : `${pendingParentLinks.length} parents want to link`,
          description: `Accept so they can ${orgChrome.parentVisibility}. Nothing is shared until you approve.`,
          action: { href: "#family", label: "Review family requests" },
          secondary:
            myOrgs.length === 0
              ? { href: "/orgs", label: "Join a school or club" }
              : searchAction,
        }
      : actionCount > 0
        ? {
            title:
              upcomingInvitations.length > 0
                ? `${upcomingInvitations.length} ${
                    upcomingInvitations.length === 1
                      ? "invite needs"
                      : "invites need"
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
            secondary: { href: searchHref, label: "Search more tournaments" },
          }
        : myOrgs.length === 0
          ? {
              title: orgChrome.emptyJoinTitle,
              description: orgChrome.invitationsWaitDescription,
              action: { href: "/orgs", label: orgChrome.openLabel },
              secondary: isStudent ? searchAction : nextAction.secondary,
            }
          : {
              title: "Find your next tournament",
              description: orgChrome.onRosterDescription,
              action: searchAction,
              secondary: { href: "/orgs", label: orgChrome.openLabel },
            };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Plan
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Your plan
      </h1>
      <p className="mt-2 text-sm text-muted">
        {profile.display_name || "Your profile"} · {user.email}. RSVPs and
        organizer registration follow-through live here. Profile and alert
        preferences live in{" "}
        <Link
          href="/account"
          className="font-semibold text-brand-red hover:underline"
        >
          Account settings
        </Link>
        .
      </p>

      {profile.zip ? null : (
        <div className="mt-6">
          <MissingZipCard />
        </div>
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

      {pendingParentLinks.length ? (
        <section id="family" className="mt-10 scroll-mt-24">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-red">
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
                      ? `wants to link as your parent — they’ll ${orgChrome.parentVisibility}`
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

      <section id="plan" className="mt-10 scroll-mt-24">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
          Upcoming and past
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {orgChrome.rsvpExplainer}
        </p>
        {!hasTournamentWorkspace ? (
          <p className="mt-4 text-sm text-muted">
            {isStudent && myOrgs.length === 0 ? (
              <>
                No invitations yet — {orgChrome.emptyJoinTitle.toLowerCase()}{" "}
                first.{" "}
                <Link
                  href="/orgs"
                  className="font-semibold text-brand-red hover:underline"
                >
                  {orgChrome.openLabel}
                </Link>
              </>
            ) : (
              <>
                You don&rsquo;t have tournament plans yet.{" "}
                <Link
                  href={searchHref}
                  className="font-semibold text-brand-red hover:underline"
                >
                  Search tournaments
                </Link>
              </>
            )}
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
                          {formatTournamentMeta(row.competition!)}
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
                      meta={formatTournamentMeta(competition)}
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
                      meta={`${formatTournamentMeta(plan.competition)} · ${planStatus(
                        plan,
                        false
                      )}`}
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
                  {pastPlans.map((plan) => {
                    const row = entrantRows.find(
                      (entrant) => entrant.competition_id === plan.competitionId
                    );
                    const recorded = formatRecordedResult({
                      placement: row?.placement,
                      awardLabel: row?.award_label,
                      sectionName: row?.section_name,
                    });
                    return (
                    <PortalListRow
                      key={plan.competitionId}
                      href={`/event/${plan.competition.slug}`}
                      title={plan.competition.name}
                      meta={`${formatTournamentMeta(plan.competition)} · ${planStatus(
                        plan,
                        true
                      )}${
                        recorded
                          ? ` · ${recorded}`
                          : row?.status === "attended"
                            ? " · result not recorded"
                            : ""
                      }`}
                    />
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {parentLinks.length && !pendingParentLinks.length ? (
        <section
          id="family"
          className="mt-12 scroll-mt-24 border-t border-line pt-8"
        >
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
                    linked as your parent
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
          Saved items
        </summary>
        <div className="mt-6 flex flex-col gap-10">
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
                    city: string | null;
                    state: string | null;
                    start_date: string;
                    end_date: string | null;
                  } | null;
                  if (!c) return null;
                  return (
                    <PortalListRow
                      key={row.competition_id}
                      href={`/event/${c.slug}`}
                      title={c.name}
                      meta={formatTournamentMeta(c)}
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
