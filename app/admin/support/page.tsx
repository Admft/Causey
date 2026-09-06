import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminMixChart } from "@/components/AdminCharts";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminOpsStats } from "@/lib/data/admin";
import { getAdminSupportReports } from "@/lib/data/support";

export const metadata: Metadata = {
  title: "Problem reports",
  description: "Read and reply to problem reports sent from Support.",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: "open" | "replied" | "closed") {
  if (status === "open") return "Open";
  if (status === "replied") return "Replied";
  return "Closed";
}

export default async function AdminSupportPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [stats, reports] = await Promise.all([
    getAdminOpsStats(["support"]),
    getAdminSupportReports(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Problem reports
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        People send these from Support. Reply here to email them and write an
        Alert when they have a Causey account. Replying only in email skips
        Alerts.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Support"
          items={[
            {
              label: "Open",
              value: stats.support.open,
              href: "/admin/support",
            },
            {
              label: "Replied",
              value: stats.support.replied,
              href: "/admin/support",
            },
            {
              label: "Closed",
              value: stats.support.closed,
              href: "/admin/support",
            },
          ]}
          chart={
            <AdminMixChart
              title="Problem reports"
              segments={[
                {
                  label: "Open",
                  value: stats.support.open,
                  tone: "attention",
                },
                {
                  label: "Replied",
                  value: stats.support.replied,
                  tone: "progress",
                },
                {
                  label: "Closed",
                  value: stats.support.closed,
                  tone: "ok",
                },
              ]}
            />
          }
        />
      </div>

      {reports.error ? (
        <p className="mt-8 text-sm text-muted" role="alert">
          {reports.error}
        </p>
      ) : reports.reports.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No problem reports yet. They appear here after someone uses Support.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {reports.reports.map((report) => (
            <li key={report.id} className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {statusLabel(report.status)} · {formatWhen(report.createdAt)}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                <Link
                  href={`/admin/support/${report.id}`}
                  className="hover:text-brand-red hover:underline"
                >
                  {report.reporterEmail}
                </Link>
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{report.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
