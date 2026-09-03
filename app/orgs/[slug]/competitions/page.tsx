import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalEmptyState, PortalListRow } from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import { competitionTypeLabel } from "@/lib/competition-types";
import {
  getOrgAttendedEvents,
  getOrgBySlugForViewer,
  getOrgCompetitionWorkspace,
  isSupabaseConfigured,
  isUpcomingEvent,
} from "@/lib/data/portal";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import { CompetitionCategorySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization competitions",
  description: "Hosted competition drafts, reviews, upcoming events, and history.",
};

const STATUS_OPTIONS = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
] as const;

function statusLabel(status: string): string {
  if (status === "pending_review") return "awaiting platform review";
  if (status === "rejected") return "returned for changes";
  if (status === "archived") return "archived";
  return status;
}

function manageHref(event: { slug: string; status: string }): string {
  return event.status === "rejected"
    ? `/event/${event.slug}/edit`
    : `/event/${event.slug}/manage`;
}

export default async function OrgCompetitionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    category?: string;
    status?: string;
    timing?: string;
    host?: string;
  }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/competitions`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  const [workspace, attendedEvents] = await Promise.all([
    getOrgCompetitionWorkspace(view.org),
    view.org.type === "district"
      ? Promise.resolve([])
      : getOrgAttendedEvents(view.org.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const category = CompetitionCategorySchema.safeParse(filters.category);
  const status =
    view.canManageTournaments &&
    STATUS_OPTIONS.includes(filters.status as (typeof STATUS_OPTIONS)[number])
      ? filters.status
      : null;
  const timing =
    filters.timing === "past" || filters.timing === "upcoming"
      ? filters.timing
      : "all";

  function matchesEventFilters(
    event: (typeof workspace.events)[number],
    options: { ignoreHost?: boolean; ignoreStatus?: boolean } = {}
  ) {
    if (category.success && event.category !== category.data) return false;
    if (!options.ignoreStatus && status && event.status !== status) return false;
    if (!options.ignoreHost && filters.host && event.host?.id !== filters.host) {
      return false;
    }
    if (timing === "upcoming" && !isUpcomingEvent(event, today)) return false;
    if (timing === "past" && isUpcomingEvent(event, today)) return false;
    return true;
  }

  const hostedIds = new Set(workspace.events.map((event) => event.id));
  const events = workspace.events.filter((event) => matchesEventFilters(event));
  const travelEvents = attendedEvents.filter(
    (event) =>
      event.status === "published" &&
      !hostedIds.has(event.id) &&
      matchesEventFilters(event, { ignoreHost: true, ignoreStatus: true })
  );
  const hostById = new Map(workspace.hosts.map((host) => [host.id, host]));
  const drafts = workspace.drafts.filter((draft) => {
    if (category.success && draft.data.category !== category.data) return false;
    if (status && status !== "draft") return false;
    if (filters.host && draft.org_id !== filters.host) return false;
    return timing !== "past";
  });
  const hasFilters = Boolean(
    filters.category || filters.status || filters.host || timing !== "all"
  );

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="competitions"
        showRoster={view.isCoach && view.org.type !== "district"}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-brand-red">
              {view.org.type === "district"
                ? "District and school events"
                : view.org.type === "school"
                  ? "School events"
                  : view.org.type === "team"
                    ? "Team events"
                    : "Club events"}
            </p>
            <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
              Competitions
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {view.org.type === "district"
                ? "Review competitions hosted by the district and each connected school."
                : "Review hosted drafts and events, plus public tournaments this organization marked as attending."}
            </p>
          </div>
          {view.canManageTournaments ? (
            <Link
              href={`/orgs/${view.org.slug}/competitions/new`}
              className="cta-enabled shrink-0"
            >
              Create competition
            </Link>
          ) : null}
        </div>

        <form
          method="get"
          className="mt-8 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label>
            <span className="text-xs font-semibold text-muted-strong">Type</span>
            <select
              name="category"
              className="field mt-1"
              defaultValue={category.success ? category.data : ""}
            >
              <option value="">All types</option>
              <option value="chess">Chess</option>
              <option value="stem">STEM</option>
              <option value="debate">Debate</option>
              <option value="arts">Arts</option>
              <option value="writing">Writing</option>
              <option value="other">Other</option>
            </select>
          </label>
          {view.canManageTournaments ? (
            <label>
              <span className="text-xs font-semibold text-muted-strong">Status</span>
              <select
                name="status"
                className="field mt-1"
                defaultValue={status ?? ""}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Awaiting review</option>
                <option value="published">Published</option>
                <option value="rejected">Returned</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          ) : null}
          <label>
            <span className="text-xs font-semibold text-muted-strong">Timing</span>
            <select name="timing" className="field mt-1" defaultValue={timing}>
              <option value="all">Upcoming and past</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </label>
          {view.org.type === "district" ? (
            <label>
              <span className="text-xs font-semibold text-muted-strong">Host</span>
              <select
                name="host"
                className="field mt-1"
                defaultValue={filters.host ?? ""}
              >
                <option value="">District and all schools</option>
                {workspace.hosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-end gap-3">
              <button type="submit" className="cta-enabled">
                Apply filters
              </button>
              {hasFilters ? (
                <Link
                  href={`/orgs/${view.org.slug}/competitions`}
                  className="py-3 text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          )}
          {view.org.type === "district" ? (
            <div className="flex items-end gap-3 lg:col-start-4">
              <button type="submit" className="cta-enabled">
                Apply filters
              </button>
              {hasFilters ? (
                <Link
                  href={`/orgs/${view.org.slug}/competitions`}
                  className="py-3 text-sm font-semibold text-muted-strong hover:text-brand-red"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          ) : null}
        </form>

        {!drafts.length && !events.length && !travelEvents.length ? (
          <div className="mt-8">
            <PortalEmptyState
              title={hasFilters ? "No competitions match" : "No competitions yet"}
              description={
                hasFilters
                  ? "Clear a filter or choose a different type, status, or time."
                  : view.canManageTournaments
                    ? view.org.type === "club" || view.org.type === "team"
                      ? "Find a public tournament for the roster, or host one here."
                      : "Create a competition, choose who can see it, then invite your roster."
                    : "Competitions you can view will appear here after staff publish them."
              }
              action={
                view.canManageTournaments && !hasFilters
                  ? view.org.type === "club" || view.org.type === "team"
                    ? {
                        href: "/#search",
                        label: "Search tournaments",
                      }
                    : {
                        href: `/orgs/${view.org.slug}/competitions/new`,
                        label: "Create competition",
                      }
                  : hasFilters
                    ? {
                        href: `/orgs/${view.org.slug}/competitions`,
                        label: "Clear filters",
                      }
                    : {
                        href: `/orgs/${view.org.slug}`,
                        label: "Back to overview",
                      }
              }
            />
          </div>
        ) : (
          <div className="mt-8">
            {drafts.length ? (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                  Saved drafts
                </h2>
                <ul className="mt-2">
                  {drafts.map((draft) => {
                    const host = hostById.get(draft.org_id);
                    return (
                      <PortalListRow
                        key={draft.id}
                        organizationHosted
                        title={draft.data.name.trim() || "Untitled competition"}
                        meta={`${competitionTypeLabel({
                          category: draft.data.category,
                          customCategoryName: draft.data.customCategoryName,
                        })}${host ? ` · ${host.name}` : ""} · saved ${new Intl.DateTimeFormat(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        ).format(new Date(draft.updated_at))}`}
                        trailing={
                          <Link
                            href={`/orgs/${view.org.slug}/competitions/new?draft=${draft.id}&host=${draft.org_id}`}
                            className="text-sm font-semibold text-brand-red hover:underline"
                          >
                            Resume
                          </Link>
                        }
                      />
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {events.length ? (
              <section className={drafts.length ? "mt-10" : undefined}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                  Hosted records
                </h2>
                <ul className="mt-2">
                  {events.map((event) => (
                    <PortalListRow
                      key={event.id}
                      organizationHosted
                      href={`/event/${event.slug}`}
                      title={event.name}
                      meta={`${competitionTypeLabel({
                        category: event.category,
                        customCategoryName: event.custom_category_name,
                      })}${event.host ? ` · ${event.host.name}` : ""} · ${formatDateRange(
                        event.start_date,
                        event.end_date
                      )}${
                        event.city && event.state
                          ? ` · ${event.city}, ${event.state}`
                          : event.participation_mode === "online"
                            ? " · online"
                            : ""
                      } · ${formatFeeCents(event.entry_fee_cents)} · ${statusLabel(
                        event.status
                      )}`}
                      trailing={
                        view.canManageTournaments &&
                        event.status !== "archived" ? (
                          <Link
                            href={manageHref(event)}
                            className="text-sm font-semibold text-brand-red hover:underline"
                          >
                            {event.status === "rejected"
                              ? "Fix and resubmit"
                              : "Manage"}
                          </Link>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {travelEvents.length ? (
              <section
                className={
                  drafts.length || events.length ? "mt-10" : undefined
                }
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                  Travel
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Public competitions this organization marked as attending,
                  including past events so attendance and results stay reachable.
                </p>
                <ul className="mt-2">
                  {travelEvents.map((event) => (
                    <PortalListRow
                      key={event.id}
                      href={`/event/${event.slug}`}
                      title={event.name}
                      meta={`${competitionTypeLabel({
                        category: event.category,
                        customCategoryName: event.custom_category_name,
                      })}${
                        event.host ? ` · hosted by ${event.host.name}` : ""
                      } · ${formatDateRange(
                        event.start_date,
                        event.end_date
                      )}${
                        event.city && event.state
                          ? ` · ${event.city}, ${event.state}`
                          : event.participation_mode === "online"
                            ? " · online"
                            : ""
                      } · ${formatFeeCents(event.entry_fee_cents)}`}
                      trailing={
                        view.canManageTournaments ? (
                          <Link
                            href={`/event/${event.slug}/manage`}
                            className="text-sm font-semibold text-brand-red hover:underline"
                          >
                            Manage
                          </Link>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
