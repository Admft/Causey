import type { Metadata } from "next";
import Link from "next/link";
import { AdminTournamentBulkList } from "@/components/AdminTournamentBulkList";
import { getAdminTournaments } from "@/lib/data/admin";
import {
  COMPETITION_SOURCE_FILTER_OPTIONS,
  competitionSourceLabel,
} from "@/lib/ingestion-sources";

export const metadata: Metadata = {
  title: "Admin tournaments",
  description: "Create, review, publish, archive, and restore tournament records.",
};

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const filters = await searchParams;
  const tournaments = await getAdminTournaments(filters);
  const draftSourceGroup =
    filters.status === "draft" && filters.source
      ? competitionSourceLabel(filters.source)
      : null;

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
            awaiting a decision belong in Moderation. Select many records, or
            filter by scrape source and publish the whole draft group.
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

      {draftSourceGroup ? (
        <p className="mt-4 text-sm text-muted">
          Showing drafts from {draftSourceGroup}. Use select-all or{" "}
          <span className="font-semibold text-muted-strong">
            Publish all matching drafts
          </span>{" "}
          to accept the scrape group.
        </p>
      ) : null}

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
          <div className="mt-4">
            <AdminTournamentBulkList
              tournaments={tournaments.map((tournament) => ({
                id: tournament.id,
                slug: tournament.slug,
                name: tournament.name,
                city: tournament.city,
                state: tournament.state,
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                source: tournament.source,
                status: tournament.status,
                organizations: tournament.organizations
                  ? { name: tournament.organizations.name }
                  : null,
              }))}
              filterStatus={filters.status}
              filterSource={filters.source}
            />
          </div>
        )}
      </section>
    </main>
  );
}
