import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAuditLog, getAdminOverview } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Administration",
  description: "Causey platform operations for organizations and tournaments.",
};

export default async function AdminOverviewPage() {
  const [overview, auditRows] = await Promise.all([
    getAdminOverview(),
    getAdminAuditLog(12),
  ]);

  const stats = [
    { label: "Organizations", value: overview.organizations },
    { label: "Tournament drafts", value: overview.drafts },
    { label: "Published tournaments", value: overview.published },
    { label: "Archived tournaments", value: overview.archived },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Operations overview
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Create district and school workspaces, review tournament records, and
        use reversible status changes instead of deleting public history.
      </p>

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-line bg-surface px-4 py-4"
          >
            <dt className="text-xs font-semibold text-muted">{stat.label}</dt>
            <dd className="mt-2 font-display text-display-sm font-bold text-foreground">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="section-rule mt-10 pt-8">
        <h2 className="text-sm font-semibold text-foreground">Common tasks</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/organizations" className="cta-enabled">
            Create a district or school
          </Link>
          <Link
            href="/admin/tournaments/new"
            className="inline-flex items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/35 hover:text-brand-red"
          >
            Add a tournament draft
          </Link>
          <Link
            href="/admin/tournaments?status=draft"
            className="inline-flex items-center px-1 py-2 text-sm font-semibold text-brand-red hover:underline"
          >
            Review drafts
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
                typeof row.details.name === "string" ? row.details.name : row.target_id;
              const status =
                typeof row.details.status === "string" ? row.details.status : null;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <span className="text-sm text-foreground">
                    <strong className="font-semibold capitalize">{row.action}</strong>{" "}
                    {row.target_type === "competitions" ? "tournament" : "organization"}{" "}
                    <span className="font-medium">{name}</span>
                    {status ? ` · ${status}` : ""}
                  </span>
                  <time className="text-xs text-muted" dateTime={row.created_at}>
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
