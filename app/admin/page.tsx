import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminOpsLedger } from "@/components/AdminStatStrip";
import { PortalMission } from "@/components/PortalPrimitives";
import { adminTournamentsHref } from "@/lib/admin-tournament-filters";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import {
  getAdminAuditLog,
  getAdminModerationQueue,
  getAdminOpsStats,
} from "@/lib/data/admin";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Administration",
  description: "Review public tournament submissions and manage Causey operations.",
};

export default async function AdminOverviewPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [stats, auditRows, moderation] = await Promise.all([
    getAdminOpsStats(),
    getAdminAuditLog(8),
    getAdminModerationQueue(),
  ]);

  const pending = stats.listings.pendingReview;
  const queuePreview = moderation.queue.slice(0, 3);
  const mission =
    pending === null
      ? {
          title: "Review queue is unavailable",
          description:
            "Listing counts could not be loaded. Open moderation and try again rather than treating the queue as empty.",
          action: { href: "/admin/moderation", label: "Open review queue" },
          secondary: {
            href: "/admin/tournaments?status=pending_review",
            label: "Browse pending records",
          },
        }
      : pending > 0
        ? {
            title:
              pending === 1
                ? "1 public tournament needs review"
                : `${pending} public tournaments need review`,
            description:
              "These organizer listings stay out of discovery until you approve or send them back with a note.",
            action: { href: "/admin/moderation", label: "Open review queue" },
            secondary: {
              href: "/admin/tournaments?status=pending_review",
              label: "Browse pending records",
            },
          }
        : {
            title: "Review queue is clear",
            description:
              "When coaches submit public tournaments, they land here first. Use the quieter links below for drafts, orgs, and records.",
            action: { href: "/admin/moderation", label: "Open moderation" },
            secondary: {
              href: "/admin/tournaments?status=draft",
              label: "Review drafts",
            },
          };

  const lastRunLabel = stats.ingestion.runsUnavailable
    ? null
    : stats.ingestion.lastRunStatus
      ? stats.ingestion.lastRunStatus === "succeeded"
        ? "Succeeded"
        : stats.ingestion.lastRunStatus === "failed"
          ? "Failed"
          : "Running"
      : "None yet";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Moderation first
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Keep bad or incomplete public listings out of category directories.
        Create districts and drafts only after the review queue is handled.
      </p>

      <div className="mt-8">
        <PortalMission
          title={mission.title}
          description={mission.description}
          action={mission.action}
          secondary={mission.secondary}
        />
      </div>

      <section className="section-rule mt-10 pt-8" aria-labelledby="ops-ledger-heading">
        <h2
          id="ops-ledger-heading"
          className="font-display text-xl font-bold text-foreground"
        >
          Operations
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Counts are global. Unavailable means the query failed — not that the
          number is zero.
        </p>
        <div className="mt-8">
          <AdminOpsLedger
            groups={[
              {
                title: "Moderation",
                items: [
                  {
                    label: "Awaiting review",
                    value: stats.listings.pendingReview,
                    href: "/admin/moderation",
                  },
                  {
                    label: "Rejected listings",
                    value: stats.listings.rejected,
                    href: adminTournamentsHref({ status: "rejected" }),
                  },
                  {
                    label: "Published organizer listings",
                    value: stats.listings.publishedOrganizer,
                    href: adminTournamentsHref({
                      status: "published",
                      source: "organizer",
                    }),
                  },
                ],
              },
              {
                title: "Tournaments",
                items: [
                  {
                    label: "Published",
                    value: stats.listings.published,
                    href: adminTournamentsHref({ status: "published" }),
                  },
                  {
                    label: "Drafts",
                    value: stats.listings.drafts,
                    href: adminTournamentsHref({ status: "draft" }),
                  },
                  {
                    label: "Pending review",
                    value: stats.listings.pendingReview,
                    href: adminTournamentsHref({ status: "pending_review" }),
                  },
                  {
                    label: "Archived",
                    value: stats.listings.archived,
                    href: adminTournamentsHref({ status: "archived" }),
                  },
                  {
                    label: "Ready to publish",
                    value: stats.listings.readyToPublish,
                    href: adminTournamentsHref({ status: "draft", ready: true }),
                  },
                ],
              },
              {
                title: "Organizations",
                items: [
                  {
                    label: "Need review",
                    value: stats.organizations.pending,
                    href: "/admin/organizations?status=pending",
                  },
                  {
                    label: "Corrections sent",
                    value: stats.organizations.rejected,
                    href: "/admin/organizations?status=rejected",
                  },
                  {
                    label: "Verified",
                    value: stats.organizations.verified,
                    href: "/admin/organizations?status=verified",
                  },
                  {
                    label: "Total",
                    value: stats.organizations.total,
                    href: "/admin/organizations",
                  },
                  {
                    label: "Districts",
                    value: stats.organizations.districts,
                    href: "/admin/organizations",
                  },
                ],
              },
              {
                title: "Accounts",
                items: [
                  {
                    label: "Total accounts",
                    value: stats.accounts.total,
                    href: "/admin/users",
                  },
                  {
                    label: "Platform admins",
                    value: stats.accounts.platformAdmins,
                    href: "/admin/users",
                  },
                ],
              },
              {
                title: "Scrapers",
                items: [
                  {
                    label: "Last run",
                    value: lastRunLabel,
                    href: "/admin/scrapers",
                  },
                  {
                    label: "Rows upserted last run",
                    value: stats.ingestion.runsUnavailable
                      ? null
                      : stats.ingestion.lastRowsUpserted,
                    href: "/admin/scrapers",
                  },
                  {
                    label: "Sources with issues",
                    value: stats.ingestion.issueCount,
                    href: "/admin/scrapers",
                  },
                ],
              },
            ]}
          />
        </div>
      </section>

      {queuePreview.length > 0 ? (
        <section className="section-rule mt-10 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Next in queue
            </h2>
            <Link
              href="/admin/moderation"
              className="text-sm font-semibold text-brand-red hover:underline"
            >
              {pending === null ? "See all" : `See all ${pending}`}
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {queuePreview.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{row.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {row.organizations?.name ?? row.organizer_name ?? "Organizer"}
                  {" · "}
                  {formatDateRange(row.start_date, row.end_date)}
                  {" · "}
                  {row.city}, {row.state}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Other tasks</h2>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            href="/admin/tournaments/new"
            className="font-semibold text-muted-strong transition-colors hover:text-brand-red"
          >
            Add a tournament draft
          </Link>
          <Link
            href="/admin/organizations"
            className="font-semibold text-muted-strong transition-colors hover:text-brand-red"
          >
            Create a district or school
          </Link>
          <Link
            href="/admin/tournaments"
            className="font-semibold text-muted-strong transition-colors hover:text-brand-red"
          >
            Browse all tournaments
          </Link>
        </div>
      </section>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">
          Recent administrative changes
        </h2>
        {!auditRows.length ? (
          <p className="mt-3 text-sm text-muted">
            No administrative changes have been recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {auditRows.map((row) => {
              const name =
                typeof row.details.name === "string"
                  ? row.details.name
                  : row.target_id;
              const status =
                typeof row.details.status === "string"
                  ? row.details.status
                  : null;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <span className="text-sm text-foreground">
                    <strong className="font-semibold capitalize">
                      {row.action}
                    </strong>{" "}
                    {row.target_type === "competitions"
                      ? "tournament"
                      : row.target_type === "profile"
                        ? "account"
                        : "organization"}{" "}
                    <span className="font-medium">{name}</span>
                    {status ? ` · ${status}` : ""}
                  </span>
                  <time
                    className="text-xs text-muted"
                    dateTime={row.created_at}
                  >
                    {new Date(row.created_at).toLocaleString("en-US")}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
