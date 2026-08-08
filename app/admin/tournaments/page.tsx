import type { Metadata } from "next";
import Link from "next/link";
import { AdminTournamentStatusActions } from "@/components/AdminTournamentStatusActions";
import { getAdminTournaments } from "@/lib/data/admin";
import { formatDateRange } from "@/lib/format";
import {
  COMPETITION_SOURCE_FILTER_OPTIONS,
  competitionSourceLabel,
} from "@/lib/ingestion-sources";

export const metadata: Metadata = {
  title: "Admin tournaments",
  description: "Create, review, publish, archive, and restore tournament records.",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const filters = await searchParams;
  const tournaments = await getAdminTournaments(filters);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-red">Platform admin</p>
          <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
            Tournaments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Drafts and rejected records are not public. Organizer submissions
            awaiting a decision belong in Moderation. Archiving removes a
            tournament from discovery without deleting its history.
          </p>
        </div>
        <Link href="/admin/tournaments/new" className="cta-enabled">
          Add a tournament draft
        </Link>
      </div>

      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"
      >
        <label className="flex min-w-40 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Status</span>
          <select className="field" name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Awaiting review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex min-w-40 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Source</span>
          <select className="field" name="source" defaultValue={filters.source ?? ""}>
            <option value="">All sources</option>
            {COMPETITION_SOURCE_FILTER_OPTIONS.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="cta-enabled">
          Apply filters
        </button>
        {filters.status || filters.source ? (
          <Link
            href="/admin/tournaments"
            className="px-1 py-2 text-sm font-semibold text-muted-strong hover:text-brand-red"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <section className="section-rule mt-8 pt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Records</h2>
          <span className="text-xs text-muted">{tournaments.length} shown</span>
        </div>
        {!tournaments.length ? (
          <div className="mt-4 text-sm text-muted">
            <p>No tournaments match these filters.</p>
            <Link
              href={
                filters.status || filters.source
                  ? "/admin/tournaments"
                  : "/admin/tournaments/new"
              }
              className="mt-2 inline-block font-semibold text-brand-red hover:underline"
            >
              {filters.status || filters.source
                ? "Clear filters and show all records"
                : "Add the first tournament draft"}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {tournaments.map((tournament) => (
              <li
                key={tournament.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {tournament.status === "published" ? (
                      <Link
                        href={`/event/${tournament.slug}`}
                        className="font-semibold text-foreground hover:text-brand-red"
                      >
                        {tournament.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">
                        {tournament.name}
                      </span>
                    )}
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-2xs font-semibold text-muted-strong">
                      {STATUS_LABELS[tournament.status] ?? tournament.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateRange(tournament.start_date, tournament.end_date)}
                    {` · ${tournament.city}, ${tournament.state}`}
                    {` · ${competitionSourceLabel(tournament.source)}`}
                    {tournament.organizations
                      ? ` · ${tournament.organizations.name}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                  <Link
                    href={`/admin/tournaments/${tournament.id}/edit`}
                    className="text-sm font-semibold text-foreground hover:text-brand-red"
                  >
                    Edit
                  </Link>
                  <AdminTournamentStatusActions
                    competitionId={tournament.id}
                    eventSlug={tournament.slug}
                    status={tournament.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
