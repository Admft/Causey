import type { Metadata } from "next";
import Link from "next/link";
import { PortalMission } from "@/components/PortalPrimitives";
import {
  getAdminAuditLog,
  getAdminModerationQueue,
  getAdminOverview,
} from "@/lib/data/admin";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Administration",
  description: "Review public tournament submissions and manage Causey operations.",
};

export default async function AdminOverviewPage() {
  const [overview, auditRows, moderation] = await Promise.all([
    getAdminOverview(),
    getAdminAuditLog(8),
    getAdminModerationQueue(),
  ]);

  const pending = overview.pendingReview;
  const queuePreview = moderation.queue.slice(0, 3);
  const mission =
    pending > 0
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

  const stats = [
    { label: "Awaiting review", value: pending, href: "/admin/moderation" },
    {
      label: "Tournament drafts",
      value: overview.drafts,
      href: "/admin/tournaments?status=draft",
    },
    {
      label: "Published",
      value: overview.published,
      href: "/admin/tournaments?status=published",
    },
    {
      label: "Organizations",
      value: overview.organizations,
      href: "/admin/organizations",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Moderation first
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Keep bad or incomplete public listings out of chess search. Create
        districts and drafts only after the review queue is handled.
      </p>

      <div className="mt-8">
        <PortalMission
          title={mission.title}
          description={mission.description}
          action={mission.action}
          secondary={mission.secondary}
        />
      </div>

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
              See all {pending}
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

      <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-line bg-surface px-4 py-4 transition-colors hover:border-brand-red/35"
          >
            <dt className="text-xs font-semibold text-muted">{stat.label}</dt>
            <dd className="mt-2 font-display text-display-sm font-bold text-foreground">
              {stat.value}
            </dd>
          </Link>
        ))}
      </dl>

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
