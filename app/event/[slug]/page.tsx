import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataSource } from "@/lib/data";
import { walkPathways } from "@/lib/qualification";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import { EligibilityBadges } from "@/components/EligibilityBadges";
import { PathwayStatusPanel } from "@/components/PathwayStatusPanel";
import { SourceBadge } from "@/components/SourceBadge";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import type { PathwayStatus } from "@/lib/schemas";
import { eventStanding, isFeaturedStanding } from "@/lib/event-standing";
import { EventStandingLabel } from "@/components/EventStandingLabel";
import { FeaturedAwardMark } from "@/components/FeaturedAwardMark";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import {
  DifficultyRating,
  SaveCompetitionButton,
} from "@/components/AccountCompetitionActions";
import { isCompetitionEnded } from "@/lib/competition-timing";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RsvpButtons } from "@/components/RsvpButtons";
import {
  canManageCompetitionAsViewer,
  getActiveChildren,
  getCompetitionBySlugAuthed,
  getEntrantsForCompetition,
} from "@/lib/data/portal";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  // Anon lookup first; fall back to the viewer's session for private org events.
  const competition =
    (await getDataSource().getCompetitionBySlug(slug)) ??
    (await getCompetitionBySlugAuthed(slug));
  if (!competition) return { title: "Event not found" };
  return {
    title: competition.name,
    description: `${competition.name} in ${competition.city}, ${competition.state} on ${competition.start_date}. Entry ${formatFeeCents(competition.entry_fee_cents)}. Sections, eligibility, and qualification pathways on Causey.`,
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

  const [rules, seriesList] = await Promise.all([
    data.listQualificationRules(),
    data.listSeries(),
  ]);
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
  });
  const ended = isCompetitionEnded(competition);

  const user = await getSessionUser();
  let initiallySaved = false;
  let initialScore: number | null = null;
  let canManage = false;
  let rsvpTargets: {
    profileId: string;
    label: string;
    status: "invited" | "going" | "not_going";
  }[] = [];
  if (user) {
    canManage = await canManageCompetitionAsViewer(competition, user.id);
    const children = await getActiveChildren(user.id);
    const entrants = await getEntrantsForCompetition(competition.id, [
      user.id,
      ...children.map((c) => c.profile_id),
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
    const [{ data: saved }, { data: rating }] = await Promise.all([
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
    ]);
    initiallySaved = Boolean(saved);
    initialScore = rating?.score ?? null;
  }

  return (
    <>
      <ChessSubnavBar tool="tournaments" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link
        href="/chess"
        className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        ← All chess tournaments
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative mb-6 max-w-2xl">
            {isFeaturedStanding(standing) ? (
              <FeaturedAwardMark className="absolute left-3 top-3 z-10 h-9 w-9" />
            ) : null}
            {competition.image_url ? (
              <CompetitionCoverImage
                src={competition.image_url}
                alt=""
                aspectClass="aspect-[2/1]"
                className="rounded-2xl"
              />
            ) : (
              <div
                className="aspect-[2/1] rounded-2xl bg-surface-soft"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
              Chess{competition.series ? ` · ${competition.series.name}` : ""}
            </p>
            {ended ? (
              <span className="rounded-md border border-line bg-surface-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
                Ended
              </span>
            ) : null}
            <SourceBadge source={competition.source} />
          </div>
          <h1 className="mt-1 max-w-[24ch] font-display text-display font-bold tracking-tight text-foreground">
            {competition.name}
          </h1>

          <div className="mt-4 max-w-lg border-l-2 border-brand-red/40 pl-3">
            <EventStandingLabel standing={standing} showHint />
          </div>

          <dl className="mt-6 grid max-w-lg grid-cols-1 gap-x-8 gap-y-3 text-base sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-muted-strong">When</dt>
              <dd className="text-foreground">
                {formatDateRange(competition.start_date, competition.end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Entry fee</dt>
              <dd className="font-semibold text-foreground">
                {feeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Where</dt>
              <dd className="text-foreground">
                {competition.venue_name}
                <br />
                <span className="text-sm text-muted">
                  {competition.address && <>{competition.address}, </>}
                  {competition.city}, {competition.state} {competition.zip}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Organizer</dt>
              <dd className="text-foreground">{competition.organizer_name}</dd>
            </div>
            {competition.reg_deadline && (
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Register by</dt>
                <dd className="text-foreground">
                  {formatDateRange(competition.reg_deadline, null)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Rating</dt>
              <dd className="text-foreground">
                {competition.rated ? "US Chess rated" : "Not rated"}
              </dd>
            </div>
          </dl>

          {competition.reg_url && regHost ? (
            <div className="mt-6">
              <a
                href={competition.reg_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-enabled"
                aria-label={`Register on ${regHost} — opens in a new tab`}
              >
                Register on {regHost} <span aria-hidden="true">↗</span>
              </a>
              <p className="mt-2 text-2xs text-muted">
                Registration and payment happen on the organizer&rsquo;s site, never on
                Causey.
              </p>
            </div>
          ) : canManage ? (
            <div className="mt-6">
              <Link href={`/event/${competition.slug}/manage`} className="cta-enabled">
                Manage entrants
              </Link>
              <p className="mt-2 text-2xs text-muted">
                Invite your roster or a group and watch RSVPs come in.
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              This event is hosted on Causey — entry is by coach invitation and
              RSVP, not open registration.
            </p>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-bold text-foreground">Sections &amp; who can enter</h2>
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
        </div>

        <aside className="flex flex-col gap-6 lg:pt-16">
          {rsvpTargets.length ? (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold text-foreground">Your RSVP</h2>
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
          {canManage && competition.reg_url ? (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold text-foreground">Hosting</h2>
              <Link
                href={`/event/${competition.slug}/manage`}
                className="mt-2 inline-flex text-sm font-semibold text-brand-red hover:underline"
              >
                Manage entrants
              </Link>
            </div>
          ) : null}
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold text-foreground">Your account</h2>
            <div className="mt-3 flex flex-col gap-4">
              <SaveCompetitionButton
                competitionId={competition.id}
                initiallySaved={initiallySaved}
                signedIn={Boolean(user)}
              />
              <DifficultyRating
                competitionId={competition.id}
                initialScore={initialScore}
                signedIn={Boolean(user)}
              />
            </div>
          </div>
          <PathwayStatusPanel
            status={pathwayStatus}
            summary={competition.pathway_summary}
            related={competition.pathway_related}
            unlocks={unlocks}
            sourceUrl={competition.source_url ?? competition.reg_url}
          />
        </aside>
      </div>
    </div>
    </>
  );
}
