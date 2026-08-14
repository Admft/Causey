import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTournamentBulkList } from "@/components/AdminTournamentBulkList";
import {
  ADMIN_TOURNAMENT_AUDIENCE_OPTIONS,
  ADMIN_TOURNAMENT_MODE_OPTIONS,
  ADMIN_TOURNAMENT_TYPE_OPTIONS,
  adminTournamentsHaveFilters,
  adminTournamentsHref,
  parseAdminTournamentFilters,
} from "@/lib/admin-tournament-filters";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import {
  getAdminTournamentCount,
  getAdminTournaments,
} from "@/lib/data/admin";
import {
  COMPETITION_SOURCE_FILTER_OPTIONS,
  competitionSourceLabel,
  competitionSourceOptionsForCategory,
  sourceByCompetitionSource,
} from "@/lib/ingestion-sources";
import {
  discoveryCategory,
  discoveryCategoryHref,
} from "@/lib/category-discovery";
import { isTournamentPublishReady } from "@/lib/tournament-readiness";

export const metadata: Metadata = {
  title: "Admin tournaments",
  description: "Create, review, publish, archive, and restore tournament records.",
};

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    source?: string;
    ready?: string;
    category?: string;
    timing?: string;
    q?: string;
    state?: string;
    mode?: string;
    audience?: string;
  }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const rawFilters = await searchParams;
  const filters = parseAdminTournamentFilters(rawFilters);
  const hasFilters = adminTournamentsHaveFilters(filters);
  const [tournaments, totalTournamentCount] = await Promise.all([
    getAdminTournaments(filters),
    getAdminTournamentCount(),
  ]);
  const draftSourceGroup =
    filters.status === "draft" && filters.source
      ? competitionSourceLabel(filters.source)
      : null;
  const selectedSource = filters.source
    ? sourceByCompetitionSource(filters.source)
    : null;
  const sourceDirectory = selectedSource
    ? discoveryCategory(selectedSource.category)
    : null;
  const sourceOptions = [
    ...(filters.category
      ? competitionSourceOptionsForCategory(filters.category)
      : COMPETITION_SOURCE_FILTER_OPTIONS),
  ];
  if (
    filters.source &&
    !sourceOptions.some((source) => source.value === filters.source)
  ) {
    sourceOptions.push({
      value: filters.source,
      label: competitionSourceLabel(filters.source),
    });
  }
  const readyDraftCount = tournaments.filter(
    (tournament) =>
      tournament.status === "draft" && isTournamentPublishReady(tournament)
  ).length;
  const statusCounts = tournaments.reduce(
    (counts, tournament) => {
      counts[tournament.status] = (counts[tournament.status] ?? 0) + 1;
      return counts;
    },
    {} as Partial<Record<string, number>>
  );
  const publishedCount = statusCounts.published ?? 0;
  const draftCount = statusCounts.draft ?? 0;
  const incompleteDraftCount = tournaments.filter(
    (tournament) =>
      tournament.status === "draft" && !isTournamentPublishReady(tournament)
  ).length;

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
            awaiting a decision belong in Moderation. Narrow by type, source,
            timing, or place, then publish a complete draft group.
          </p>
        </div>
        <Link href="/admin/tournaments/new" className="cta-enabled">
          Add a tournament draft
        </Link>
      </div>

      <form
        method="get"
        className="mt-8 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label>
          <span className="text-xs font-semibold text-muted-strong">Type</span>
          <select
            className="field mt-1"
            name="category"
            defaultValue={filters.category ?? ""}
          >
            <option value="">All types</option>
            {ADMIN_TOURNAMENT_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Status</span>
          <select
            className="field mt-1"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Awaiting review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Source</span>
          <select
            className="field mt-1"
            name="source"
            defaultValue={filters.source ?? ""}
          >
            <option value="">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Timing</span>
          <select
            className="field mt-1"
            name="timing"
            defaultValue={filters.timing ?? "all"}
          >
            <option value="all">Upcoming and ended</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">Name</span>
          <input
            className="field mt-1"
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search by tournament name"
            maxLength={80}
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">State</span>
          <input
            className="field mt-1"
            type="text"
            name="state"
            defaultValue={filters.state ?? ""}
            placeholder="TX"
            maxLength={2}
            autoComplete="address-level1"
            aria-describedby="admin-tournament-state-hint"
          />
          <span id="admin-tournament-state-hint" className="sr-only">
            Two-letter state abbreviation
          </span>
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Format</span>
          <select
            className="field mt-1"
            name="mode"
            defaultValue={filters.mode ?? ""}
          >
            <option value="">Any format</option>
            {ADMIN_TOURNAMENT_MODE_OPTIONS.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Audience</span>
          <select
            className="field mt-1"
            name="audience"
            defaultValue={filters.audience ?? ""}
          >
            <option value="">Any audience</option>
            {ADMIN_TOURNAMENT_AUDIENCE_OPTIONS.map((audience) => (
              <option key={audience.value} value={audience.value}>
                {audience.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
          <label className="flex min-h-11 items-center gap-2 pb-0.5 text-sm font-medium text-muted-strong">
            <input
              type="checkbox"
              name="ready"
              value="1"
              defaultChecked={Boolean(filters.ready)}
              className="size-4 rounded border-line"
            />
            Ready to publish
          </label>
          <button type="submit" className="cta-enabled">
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/admin/tournaments"
              className="px-1 py-2 text-sm font-semibold text-muted-strong hover:text-brand-red"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {draftSourceGroup ? (
        <p className="mt-4 text-sm text-muted">
          Showing drafts from {draftSourceGroup}. Ready records are marked; use
          select-ready or{" "}
          <span className="font-semibold text-muted-strong">
            Publish ready drafts
          </span>{" "}
          to accept the complete ones. Incomplete location rows stay draft so
          they do not enter public search with an unknown location.
          {incompleteDraftCount > 0
            ? ` ${incompleteDraftCount} still need a real city and ZIP.`
            : ""}
        </p>
      ) : null}
      {!filters.status && filters.source && publishedCount > 0 ? (
        <p className="mt-4 text-sm text-muted">
          {publishedCount} {competitionSourceLabel(filters.source)} listing
          {publishedCount === 1 ? " is" : "s are"} already published. Filter to{" "}
          <Link
            href={adminTournamentsHref(filters, { status: "published" })}
            className="font-semibold text-brand-red hover:underline"
          >
            Published
          </Link>{" "}
          or remaining{" "}
          <Link
            href={adminTournamentsHref(filters, { status: "draft" })}
            className="font-semibold text-brand-red hover:underline"
          >
            Drafts
          </Link>
          .
          {sourceDirectory ? (
            <>
              {" "}
              In {sourceDirectory.label} search, upcoming is the default — open{" "}
              <Link
                href={discoveryCategoryHref(sourceDirectory.id, {
                  source: filters.source,
                  timing: "all",
                })}
                className="font-semibold text-brand-red hover:underline"
              >
                all published {competitionSourceLabel(filters.source)} listings
              </Link>{" "}
              to include events that already ended.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="section-rule mt-8 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Records</h2>
          <span className="text-xs text-muted">
            {tournaments.length} shown
            {!filters.status && publishedCount
              ? ` · ${publishedCount} published`
              : ""}
            {!filters.status && draftCount
              ? ` · ${draftCount} draft`
              : ""}
            {readyDraftCount > 0
              ? ` · ${readyDraftCount} draft${readyDraftCount === 1 ? "" : "s"} ready`
              : ""}
          </span>
        </div>
        {!tournaments.length ? (
          <div className="mt-4 text-sm text-muted">
            <p>No tournaments match these filters.</p>
            <Link
              href={hasFilters ? "/admin/tournaments" : "/admin/tournaments/new"}
              className="mt-2 inline-block font-semibold text-brand-red hover:underline"
            >
              {hasFilters
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
                category: tournament.category,
                custom_category_name: tournament.custom_category_name,
                city: tournament.city,
                state: tournament.state,
                zip: tournament.zip,
                lat: tournament.lat,
                lng: tournament.lng,
                start_date: tournament.start_date,
                end_date: tournament.end_date,
                reg_url: tournament.reg_url,
                source: tournament.source,
                status: tournament.status,
                publishReady: isTournamentPublishReady(tournament),
                organizations: tournament.organizations
                  ? { name: tournament.organizations.name }
                  : null,
              }))}
              filterStatus={filters.status}
              filterSource={filters.source}
              totalTournamentCount={totalTournamentCount}
            />
          </div>
        )}
      </section>
    </main>
  );
}
