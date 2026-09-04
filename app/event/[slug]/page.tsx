import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataSource } from "@/lib/data";
import { competitionTypeLabel } from "@/lib/competition-types";
import { walkPathways } from "@/lib/qualification";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import { EligibilityBadges } from "@/components/EligibilityBadges";
import { PathwayStatusPanel } from "@/components/PathwayStatusPanel";
import { SourceBadge } from "@/components/SourceBadge";
import {
  formatDate,
  formatDateRangeWithWeekday,
  formatFeeCents,
} from "@/lib/format";
import { organizerCoverUrl } from "@/lib/cover-url";
import type { PathwayStatus } from "@/lib/schemas";
import { eventStanding, isFeaturedStanding } from "@/lib/event-standing";
import { FeaturedAwardMark } from "@/components/FeaturedAwardMark";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { PageBackLink } from "@/components/PageBackLink";
import {
  DifficultyRating,
  SaveCompetitionButton,
} from "@/components/AccountCompetitionActions";
import { CompetitionComments } from "@/components/CompetitionComments";
import { listCompetitionComments } from "@/lib/data/competition-comments";
import { isCompetitionEnded } from "@/lib/competition-timing";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { canPostPublicComments } from "@/lib/auth/age-band";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  discoveryCategory,
  formatCompetitionFacetLabel,
} from "@/lib/category-discovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrgAttendancePanel } from "@/components/OrgAttendancePanel";
import { RecommendEventPanel } from "@/components/RecommendEventPanel";
import { RsvpButtons } from "@/components/RsvpButtons";
import { ExternalRegistrationPanel } from "@/components/ExternalRegistrationPanel";
import type { ExternalRegistrationStatus } from "@/lib/actions/external-registrations";
import {
  canManageCompetitionAsViewer,
  getActiveChildren,
  getClubGoing,
  getCoachOrgsWithAttendance,
  getCompetitionBySlugAuthed,
  getEntrantsForCompetition,
  getMyOrgs,
  getOrganizationSlugById,
  getRatingSummary,
  getRecommendTargets,
  viewerHasOrganizationContext,
  type ClubGoingGroup,
  type CoachOrgAttendance,
  type RecommendTarget,
} from "@/lib/data/portal";
import type { EntrantStatus } from "@/lib/auth/orgs";
import {
  goingFromOrgHeading,
  orgMembershipKindsFromTypes,
} from "@/lib/portal-copy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  // Anon lookup first; fall back to the viewer's session for private org events.
  const competition =
    (await getDataSource().getCompetitionBySlug(slug)) ??
    (await getCompetitionBySlugAuthed(slug));
  if (!competition) return { title: "Event not found" };
  const location =
    competition.participation_mode === "online"
      ? "online"
      : [competition.city, competition.state].filter(Boolean).join(", ");
  const type = competitionTypeLabel({
    category: competition.category,
    customCategoryName: competition.custom_category_name,
  });
  return {
    title: competition.name,
    description: `${competition.name}, a ${type} competition ${location ? `in ${location} ` : ""}on ${competition.start_date}. Entry ${formatFeeCents(competition.entry_fee_cents)}.`,
  };
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const data = getDataSource();
  // Private org events are invisible to the anon data source — retry with
  // the viewer's cookies and let RLS decide.
  const competition =
    (await data.getCompetitionBySlug(slug)) ??
    (await getCompetitionBySlugAuthed(slug));
  if (!competition) notFound();

  const isChess = competition.category === "chess";
  const categoryDefinition = discoveryCategory(competition.category);
  // Public indexed events return to their directory; private/org-only events
  // return to the hosting organization's competition list.
  const backToDirectory =
    categoryDefinition !== null && competition.visibility === "public";
  const [rules, seriesList] = isChess
    ? await Promise.all([
        data.listQualificationRules(),
        data.listSeries(),
      ])
    : [[], []];
  const unlocks = walkPathways(
    { series_id: competition.series_id, competition_id: competition.id, placement: 1 },
    rules,
    new Map(seriesList.map((s) => [s.id, s]))
  );

  const regHost = competition.reg_url
    ? new URL(competition.reg_url).hostname.replace(/^www\./, "")
    : null;
  const feeLabel =
    competition.entry_fee_cents === null || competition.entry_fee_cents === undefined
      ? "Fee not listed"
      : competition.entry_fee_cents === 0
        ? "No entry fee"
        : formatFeeCents(competition.entry_fee_cents);
  const pathwayStatus = (competition.pathway_status ??
    (competition.series_id || unlocks.length > 0 ? "known" : "none")) as PathwayStatus;
  const standing = eventStanding({
    name: competition.name,
    source: competition.source,
    series: competition.series,
    details: competition.details,
  });
  const featuredStanding = isChess && isFeaturedStanding(standing);
  const typeLabel = [
    competitionTypeLabel({
      category: competition.category,
      customCategoryName: competition.custom_category_name,
    }),
    formatCompetitionFacetLabel(
      competition.category,
      competition.details.facets
    ),
  ]
    .filter(Boolean)
    .join(" · ");
  // Eyebrow carries the scale cue ("Chess · Blitz · FIDE Circuit"); the hint
  // sentence under the title explains it in words. Local events stay quiet.
  const eyebrowLabel = [
    typeLabel,
    isChess
      ? (competition.series?.name ??
        (standing.id !== "local" ? standing.label : null))
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // Only real event photos earn the banner. Source chrome (FIDE OG defaults,
  // logos, favicons) falls through to a text-first hero instead of a giant
  // generic box.
  const coverPhoto = organizerCoverUrl(competition.image_url);
  const ended = isCompetitionEnded(competition);

  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  const canComment = Boolean(profile && canPostPublicComments(profile));
  let initiallySaved = false;
  let initialScore: number | null = null;
  let canManage = false;
  let viewerOrgMatch = false;
  let viewerIsPlatformAdmin = false;
  let rsvpTargets: {
    profileId: string;
    label: string;
    status: EntrantStatus;
  }[] = [];
  let registrationTargets: {
    profileId: string;
    label: string;
    status: ExternalRegistrationStatus | null;
  }[] = [];
  let coachOrgs: CoachOrgAttendance[] = [];
  let recommendTargets: RecommendTarget[] = [];
  let clubGoing: ClubGoingGroup[] = [];
  let goingFromOrgLabel = "Going from your club";
  const [ratingSummary, hostOrgSlug, comments] = await Promise.all([
    getRatingSummary(competition.id),
    competition.org_id
      ? getOrganizationSlugById(competition.org_id)
      : Promise.resolve(null),
    listCompetitionComments(competition.id),
  ]);
  if (user) {
    [canManage, viewerOrgMatch] = await Promise.all([
      canManageCompetitionAsViewer(competition, user.id),
      competition.org_id
        ? viewerHasOrganizationContext(user.id, competition.org_id)
        : Promise.resolve(false),
    ]);
    // The manage RPC is also true for platform admins on any listing; only
    // spend the extra check when org membership doesn't explain the access.
    if (canManage && !viewerOrgMatch) {
      viewerIsPlatformAdmin = await isCurrentUserPlatformAdmin();
    }
    if (competition.visibility === "public") {
      coachOrgs = await getCoachOrgsWithAttendance(
        user.id,
        competition.id,
        competition.org_id
      );
    }
    [recommendTargets, clubGoing] = await Promise.all([
      getRecommendTargets(user.id),
      getClubGoing(competition.id),
    ]);
    const viewerOrgs = await getMyOrgs(user.id);
    goingFromOrgLabel = goingFromOrgHeading(
      orgMembershipKindsFromTypes(viewerOrgs.map((row) => row.org.type))
    );
    const children = await getActiveChildren(user.id);
    const childIds = children.map((c) => c.profile_id);
    const entrants = await getEntrantsForCompetition(competition.id, [
      user.id,
      ...childIds,
    ]);
    rsvpTargets = entrants.map((entrant) => ({
      profileId: entrant.profile_id,
      label:
        entrant.profile_id === user.id
          ? "You"
          : children.find((c) => c.profile_id === entrant.profile_id)
              ?.display_name ?? "Your student",
      status: entrant.status,
    }));

    const supabase = await createServerSupabaseClient();
    const registrationProfileIds = (() => {
      const childEntrants = entrants.filter((row) =>
        childIds.includes(row.profile_id)
      );
      if (childEntrants.length) {
        return childEntrants
          .filter(
            (row) => row.status === "going" || row.status === "invited"
          )
          .map((row) => row.profile_id);
      }
      const selfEntrant = entrants.find((row) => row.profile_id === user.id);
      if (selfEntrant) return [user.id];
      // Open discovery with no club invite: track the signed-in viewer.
      return [user.id];
    })();

    const [{ data: saved }, { data: rating }, { data: registrations }] =
      await Promise.all([
        supabase
          .from("saved_competitions")
          .select("competition_id")
          .eq("user_id", user.id)
          .eq("competition_id", competition.id)
          .maybeSingle(),
        supabase
          .from("competition_ratings")
          .select("score")
          .eq("user_id", user.id)
          .eq("competition_id", competition.id)
          .maybeSingle(),
        registrationProfileIds.length
          ? supabase
              .from("external_registrations")
              .select("user_id, status")
              .eq("competition_id", competition.id)
              .in("user_id", registrationProfileIds)
          : Promise.resolve({ data: [] as { user_id: string; status: string }[] }),
      ]);
    initiallySaved = Boolean(saved);
    initialScore = rating?.score ?? null;
    const registrationByUser = new Map(
      (registrations ?? []).map((row) => [
        row.user_id as string,
        row.status as ExternalRegistrationStatus,
      ])
    );
    registrationTargets = registrationProfileIds.map((profileId) => ({
      profileId,
      label:
        profileId === user.id
          ? "You"
          : children.find((c) => c.profile_id === profileId)?.display_name ??
            "Your student",
      status: registrationByUser.get(profileId) ?? null,
    }));
  }

  const needsRsvp = rsvpTargets.some((t) => t.status === "invited");
  const hasAnsweredRsvp = rsvpTargets.some(
    (t) => t.status === "going" || t.status === "not_going"
  );
  const registrationComplete =
    registrationTargets.length > 0 &&
    registrationTargets.every((t) => t.status === "registered");
  // One primary job in the main column; everything else demotes to the aside.
  // Hosts see the same attendee view as everyone else — their tools live in
  // the host bar above, not in place of the attendee's next step.
  const primaryAction: "ended" | "rsvp" | "register" | "invite_only" | "no_reg_link" =
    ended
      ? "ended"
      : needsRsvp
        ? "rsvp"
        : competition.reg_url
          ? "register"
          : competition.audience === "invite_only"
            ? "invite_only"
            : "no_reg_link";
  const showRsvpInAside =
    rsvpTargets.length > 0 && primaryAction !== "rsvp";

  return (
    <>
      {categoryDefinition ? (
        <ChessSubnavBar category={categoryDefinition.id} tool="tournaments" />
      ) : null}
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <PageBackLink
        href={
          backToDirectory
            ? categoryDefinition.href
            : hostOrgSlug
              ? `/orgs/${hostOrgSlug}/competitions`
              : "/orgs"
        }
      >
        {backToDirectory
          ? `All ${categoryDefinition.label} tournaments`
          : "Organization competitions"}
      </PageBackLink>

      {canManage && viewerOrgMatch ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-org-gold bg-org-gold-soft px-4 py-3">
          <p className="text-sm font-semibold text-org-gold-strong">
            Your organization hosts this event
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/event/${competition.slug}/manage`}
              className="cta-enabled inline-flex"
            >
              Manage event
            </Link>
            <Link
              href={`/event/${competition.slug}/edit`}
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Edit listing
            </Link>
          </div>
        </div>
      ) : null}

      {canManage && !viewerOrgMatch && viewerIsPlatformAdmin ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-soft px-4 py-3">
          <p className="text-sm font-semibold text-muted-strong">
            Platform admin tools
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/admin/tournaments/${competition.id}/edit`}
              className="cta-enabled inline-flex"
            >
              Edit tournament
            </Link>
            <Link
              href="/admin/tournaments"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Tournament queues
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
            {eyebrowLabel}
          </p>
          <div className="mt-2 flex items-start gap-3">
            {featuredStanding && !coverPhoto ? (
              <FeaturedAwardMark className="mt-1.5 h-8 w-8 shrink-0" />
            ) : null}
            <h1 className="max-w-[24ch] font-display text-display font-bold tracking-tight text-foreground">
              {competition.name}
            </h1>
          </div>
          {isChess ? (
            <p className="mt-3 max-w-prose text-sm text-muted">
              {standing.hint}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <SourceBadge source={competition.source} />
            {competition.org_id ? (
              <span className="rounded-md border border-org-gold bg-org-gold-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-org-gold-strong">
                {viewerOrgMatch ? "Your organization" : "Organization hosted"}
              </span>
            ) : null}
            {ended ? (
              <span className="rounded-md border border-line bg-surface-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
                Ended
              </span>
            ) : null}
          </div>

          {coverPhoto ? (
            <div className="relative mt-6">
              {featuredStanding ? (
                <FeaturedAwardMark className="absolute left-3 top-3 z-10 h-9 w-9" />
              ) : null}
              <CompetitionCoverImage
                src={coverPhoto}
                source={competition.source}
                alt=""
                aspectClass="aspect-[2/1]"
                className="rounded-2xl"
              />
            </div>
          ) : null}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-muted-strong">When</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatDateRangeWithWeekday(
                  competition.start_date,
                  competition.end_date
                )}
              </dd>
              <dd className="mt-1">
                <a
                  href={`/event/${competition.slug}/ics`}
                  className="text-xs font-medium text-muted-strong transition-colors hover:text-brand-red"
                >
                  Add to calendar (.ics)
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Where</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {competition.participation_mode === "online" ? (
                  "Online"
                ) : competition.venue_name ? (
                  <>
                    {competition.venue_name}
                    <span className="mt-0.5 block text-xs font-medium text-muted">
                      {[
                        competition.address,
                        [
                          competition.city,
                          competition.state,
                          competition.zip,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </>
                ) : competition.city ? (
                  [
                    competition.city,
                    [competition.state, competition.zip]
                      .filter(Boolean)
                      .join(" "),
                  ]
                    .filter(Boolean)
                    .join(", ")
                ) : (
                  <span className="font-medium text-muted">Not listed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Entry fee</dt>
              <dd
                className={`mt-1 text-sm ${
                  competition.entry_fee_cents === null ||
                  competition.entry_fee_cents === undefined
                    ? "font-medium text-muted"
                    : "font-semibold text-foreground"
                }`}
              >
                {feeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Organizer</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {competition.organizer_name ?? (
                  <span className="font-medium text-muted">Not listed</span>
                )}
              </dd>
            </div>
            {isChess ? (
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Rating</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {competition.rated ? "US Chess rated" : "Not rated"}
                </dd>
              </div>
            ) : null}
            {competition.reg_deadline ? (
              <div>
                <dt className="text-xs font-semibold text-muted-strong">
                  Register by
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {formatDate(competition.reg_deadline)}
                </dd>
              </div>
            ) : null}
          </dl>

          <section
            className="mt-8 rounded-2xl border border-line border-l-2 border-l-brand-red bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6"
            aria-labelledby="event-next-step"
          >
            {primaryAction === "ended" ? (
              <>
                <h2
                  id="event-next-step"
                  className="font-display text-xl font-bold text-foreground"
                >
                  This competition has ended
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  You can still review sections and save it for reference.
                  Registration and new RSVPs are closed.
                </p>
              </>
            ) : null}

            {primaryAction === "rsvp" ? (
              <>
                <h2
                  id="event-next-step"
                  className="font-display text-xl font-bold text-foreground"
                >
                  {rsvpTargets.length === 1 && rsvpTargets[0].label === "You"
                    ? "Your coach needs an RSVP"
                    : "An RSVP needs your response"}
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  {competition.reg_url
                    ? "Answer so your organization knows who is coming, then finish organizer registration if the event requires it."
                    : "Answer so your organization knows who is coming. Entry is through your club invite, not open registration."}
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {rsvpTargets.map((target) => (
                    <div key={target.profileId} className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-muted-strong">
                        {target.label}
                      </span>
                      <RsvpButtons
                        competitionId={competition.id}
                        profileId={target.profileId}
                        status={target.status}
                        eventSlug={competition.slug}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {primaryAction === "register" && competition.reg_url && regHost ? (
              <>
                <h2
                  id="event-next-step"
                  className="font-display text-xl font-bold text-foreground"
                >
                  {registrationComplete
                    ? "Organizer registration is marked complete"
                    : hasAnsweredRsvp
                      ? "Finish organizer registration"
                      : "Register on the organizer’s site"}
                </h2>
                {!registrationComplete ? (
                  <p className="mt-2 max-w-prose text-sm text-muted">
                    Entry and payment happen on {regHost}, not on Causey. When
                    you finish, come back and mark it complete so your Plan
                    stays accurate.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-6">
                  {(registrationTargets.length
                    ? registrationTargets
                    : [
                        {
                          profileId: undefined as string | undefined,
                          label: "You",
                          status: null as ExternalRegistrationStatus | null,
                        },
                      ]
                  ).map((target) => (
                    <div key={target.profileId ?? "self"}>
                      {registrationTargets.length > 1 ||
                      target.label !== "You" ? (
                        <p className="text-xs font-semibold text-muted-strong">
                          {target.label}
                        </p>
                      ) : null}
                      <ExternalRegistrationPanel
                        competitionId={competition.id}
                        eventSlug={competition.slug}
                        registrationHost={regHost}
                        initialStatus={target.status}
                        signedIn={Boolean(user)}
                        profileId={
                          target.label !== "You" ? target.profileId : undefined
                        }
                        forLabel={
                          target.label !== "You" ? target.label : undefined
                        }
                        embedded
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {primaryAction === "invite_only" ? (
              <>
                <h2
                  id="event-next-step"
                  className="font-display text-xl font-bold text-foreground"
                >
                  Entry is by invitation
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  This listing is invite-only. Ask your school or club coach
                  for an invite, or save it if you want to come back later.
                </p>
                {!user ? (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/event/${competition.slug}`)}`}
                    className="cta-enabled mt-5 inline-flex"
                  >
                    Sign in to save
                  </Link>
                ) : null}
              </>
            ) : null}

            {primaryAction === "no_reg_link" ? (
              <>
                <h2
                  id="event-next-step"
                  className="font-display text-xl font-bold text-foreground"
                >
                  No registration link listed
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  This listing does not include an organizer registration URL.
                  Confirm entry on the organizer&rsquo;s site if you have it,
                  or save the event.
                </p>
                {!user ? (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/event/${competition.slug}`)}`}
                    className="cta-enabled mt-5 inline-flex"
                  >
                    Sign in to save
                  </Link>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
              {isChess ? "Sections & who can enter" : "Divisions & who can enter"}
            </h2>
            <ul className="mt-4 flex flex-col">
              {competition.sections.map((section) => (
                <li
                  key={section.id}
                  className="flex flex-col gap-2 border-t border-line py-4 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">{section.name}</p>
                    <div className="mt-1.5">
                      <EligibilityBadges section={section} />
                    </div>
                  </div>
                  {section.entry_fee_cents !== null ? (
                    <p className="shrink-0 text-sm text-muted-strong">
                      {formatFeeCents(section.entry_fee_cents)} for this section
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <CompetitionComments
            competitionId={competition.id}
            eventSlug={competition.slug}
            signedIn={Boolean(user)}
            canComment={canComment}
            viewerId={user?.id ?? null}
            comments={comments}
          />
        </div>

        <aside className="flex flex-col gap-5">
          {showRsvpInAside ? (
            <div className="border-b border-line pb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                Your RSVP
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {rsvpTargets.map((target) => (
                  <div key={target.profileId} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-strong">
                      {target.label}
                    </span>
                    <RsvpButtons
                      competitionId={competition.id}
                      profileId={target.profileId}
                      status={target.status}
                      eventSlug={competition.slug}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {coachOrgs.length ? (
            <OrgAttendancePanel
              competitionId={competition.id}
              eventSlug={competition.slug}
              orgs={coachOrgs}
            />
          ) : null}
          {clubGoing.length ? (
            <div className="border-b border-line pb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                {goingFromOrgLabel}
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {clubGoing.map((group) => (
                  <p key={group.org_name} className="text-sm text-muted-strong">
                    <span className="font-semibold text-foreground">
                      {group.org_name}:
                    </span>{" "}
                    {group.names.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {user && recommendTargets.length ? (
            <RecommendEventPanel
              competitionId={competition.id}
              eventSlug={competition.slug}
              targets={recommendTargets}
            />
          ) : null}
          <div className="border-b border-line pb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Save &amp; rate
            </h2>
            {user ? (
              <div className="mt-3 flex flex-col gap-4">
                <SaveCompetitionButton
                  competitionId={competition.id}
                  initiallySaved={initiallySaved}
                  signedIn
                  returnPath={`/event/${competition.slug}`}
                />
                <DifficultyRating
                  competitionId={competition.id}
                  initialScore={initialScore}
                  signedIn
                  returnPath={`/event/${competition.slug}`}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                <Link
                  href={`/login?next=${encodeURIComponent(`/event/${competition.slug}`)}`}
                  className="font-semibold text-brand-red hover:underline"
                >
                  Sign in
                </Link>{" "}
                to save this tournament and rate its difficulty.
              </p>
            )}
            {ratingSummary ? (
              <p className="mt-3 text-xs text-muted">
                Students rate this{" "}
                <span className="font-semibold text-foreground">
                  {ratingSummary.avg_score}/10
                </span>{" "}
                ({ratingSummary.rating_count}{" "}
                {ratingSummary.rating_count === 1 ? "rating" : "ratings"})
              </p>
            ) : null}
          </div>
          {isChess ? (
            <PathwayStatusPanel
              status={pathwayStatus}
              summary={competition.pathway_summary}
              related={competition.pathway_related}
              unlocks={unlocks}
              sourceUrl={competition.source_url ?? competition.reg_url}
            />
          ) : null}
        </aside>
      </div>
    </div>
    </>
  );
}
