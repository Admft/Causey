import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataSource } from "@/lib/data";
import { walkPathways } from "@/lib/qualification";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import { EligibilityBadges } from "@/components/EligibilityBadges";
import { PathwayList } from "@/components/PathwayList";
import { formatDateRange, formatFeeCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const competition = await getDataSource().getCompetitionBySlug(slug);
  if (!competition) return { title: "Event not found" };
  return {
    title: competition.name,
    description: `${competition.name} in ${competition.city}, ${competition.state} on ${competition.start_date}. Entry ${formatFeeCents(competition.entry_fee_cents)}. Sections, eligibility, and qualification pathways on Causey.`,
  };
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const data = getDataSource();
  const competition = await data.getCompetitionBySlug(slug);
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

  const regHost = new URL(competition.reg_url).hostname.replace(/^www\./, "");
  const isInvitational = competition.entry_fee_cents === 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link
        href="/chess"
        className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        ← All chess tournaments
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Left: the event itself */}
        <div>
          <CompetitionCoverImage
            src={competition.image_url}
            alt=""
            aspectClass="aspect-[2/1]"
            className="mb-6 max-w-2xl rounded-2xl"
          />
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
            Chess{competition.series ? ` · ${competition.series.name}` : ""}
          </p>
          <h1 className="mt-1 max-w-[24ch] font-display text-display font-bold tracking-tight text-foreground">
            {competition.name}
          </h1>

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
                {isInvitational
                  ? "By invitation — no entry fee"
                  : formatFeeCents(competition.entry_fee_cents)}
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
                  {section.entry_fee_cents !== null && (
                    <p className="shrink-0 text-sm text-muted-strong">
                      {formatFeeCents(section.entry_fee_cents)} for this section
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right: what a result here leads to */}
        <aside className="lg:pt-16">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6">
            <h2 className="text-lead font-semibold text-foreground">
              What winning here unlocks
            </h2>
            {unlocks.length > 0 ? (
              <div className="mt-4">
                <PathwayList nodes={unlocks} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                No qualification rules point out of this event in our current
                data. Most tournaments are open entry — the invitational chains
                start at regionals and state championships.
              </p>
            )}
            <p className="mt-4 border-t border-line pt-3 text-2xs text-muted">
              Pathway rules are seeded scaffolding pending verification against
              official US Chess announcements.
            </p>
            <Link
              href="/pathways"
              className="mt-3 inline-block text-sm font-semibold text-muted-strong transition-colors hover:text-brand-red"
            >
              Explore other placements →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
