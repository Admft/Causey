import type { Metadata } from "next";
import Link from "next/link";
import { ModerationReviewForm } from "@/components/ModerationReviewForm";
import { getAdminModerationQueue } from "@/lib/data/admin";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import { competitionSourceLabel } from "@/lib/ingestion-sources";

export const metadata: Metadata = {
  title: "Tournament moderation",
  description: "Review organizer-submitted public tournaments before discovery.",
};

const VERIFICATION_LABELS = {
  pending: "Organization verification pending",
  verified: "Verified organization",
  rejected: "Organization verification rejected",
} as const;

export default async function ModerationPage() {
  const { queue, error } = await getAdminModerationQueue();

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Public tournament review
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Organizer listings stay out of public discovery until the source,
        audience, and event details have been reviewed.
      </p>

      {error ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Review queue unavailable
          </h2>
          <p className="mt-2 text-sm text-muted" role="alert">
            {error}{" "}
            <Link
              href="/admin/moderation"
              className="font-semibold text-brand-red hover:underline"
            >
              Try loading it again
            </Link>
            .
          </p>
        </section>
      ) : !queue.length ? (
        <section className="section-rule mt-10 pt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Review queue is clear
          </h2>
          <p className="mt-2 text-sm text-muted">
            New public submissions will appear here.{" "}
            <Link
              href="/admin/tournaments"
              className="font-semibold text-brand-red hover:underline"
            >
              Browse all tournament records
            </Link>
            .
          </p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {queue.map((tournament) => (
            <li
              key={tournament.id}
              className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold text-muted">
                {tournament.organizations?.name ?? "Organizer submission"}
                {tournament.organizations
                  ? ` · ${
                      VERIFICATION_LABELS[
                        tournament.organizations.verification_status
                      ]
                    }`
                  : ""}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                {tournament.name}
              </h2>
              <p className="mt-2 text-sm text-muted">
                Submitted by {tournament.organizer_name ?? "an organizer"}
                {tournament.submitted_for_review_at
                  ? ` · submitted ${new Date(
                      tournament.submitted_for_review_at
                    ).toLocaleDateString("en-US")}`
                  : ""}
              </p>

              <dl className="mt-5 grid gap-x-5 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-muted">Date</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatDateRange(tournament.start_date, tournament.end_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Place</dt>
                  <dd className="mt-0.5 text-foreground">
                    {tournament.venue_name
                      ? `${tournament.venue_name} · `
                      : ""}
                    {tournament.city}, {tournament.state}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Source</dt>
                  <dd className="mt-0.5 text-foreground">
                    {competitionSourceLabel(tournament.source)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">
                    Requested audience
                  </dt>
                  <dd className="mt-0.5 capitalize text-foreground">
                    {tournament.audience.replace("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">Entry</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatFeeCents(tournament.entry_fee_cents)}
                    {tournament.rated ? " · US Chess rated" : " · Unrated"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted">
                    Registration
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {tournament.reg_url ? (
                      <>
                        <a
                          href={tournament.reg_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open registration for ${tournament.name} in a new tab`}
                          className="font-semibold text-muted-strong hover:text-brand-red"
                        >
                          Open organizer page ↗
                        </a>
                        {tournament.reg_deadline
                          ? ` · due ${formatDateRange(
                              tournament.reg_deadline,
                              null
                            )}`
                          : ""}
                      </>
                    ) : (
                      "Link not provided"
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 text-sm font-semibold">
                <Link
                  href={`/admin/tournaments/${tournament.id}/edit`}
                  className="text-muted-strong hover:text-foreground"
                >
                  Check or edit the full record
                </Link>
              </div>
              <ModerationReviewForm
                competitionId={tournament.id}
                eventSlug={tournament.slug}
                tournamentName={tournament.name}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
