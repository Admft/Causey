import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSupportReportsQueue } from "@/components/AdminSupportReportsQueue";
import { AdminMixChart } from "@/components/AdminCharts";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminOpsStats } from "@/lib/data/admin";
import { getAdminSupportReports } from "@/lib/data/support";
import {
  parseSupportReportStatusFilter,
  supportReportsHref,
} from "@/lib/support";

export const metadata: Metadata = {
  title: "Problem reports",
  description: "Read and reply to problem reports sent from Support.",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [{ status: statusParam }, stats, reports] = await Promise.all([
    searchParams,
    getAdminOpsStats(["support"]),
    getAdminSupportReports(),
  ]);
  const statusFilter = parseSupportReportStatusFilter(statusParam);
  const visible = reports.error
    ? []
    : statusFilter === "all"
      ? reports.reports
      : reports.reports.filter((report) => report.status === statusFilter);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Problem reports
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        People send these from Support. Reply on a report to email them and
        write an Alert when they have a Causey account. Close junk in bulk —
        that does not send mail. Replying only in email skips Alerts.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Support"
          items={[
            {
              label: "Open",
              value: stats.support.open,
              href: supportReportsHref("open"),
              current: statusFilter === "open",
            },
            {
              label: "Replied",
              value: stats.support.replied,
              href: supportReportsHref("replied"),
              current: statusFilter === "replied",
            },
            {
              label: "Closed",
              value: stats.support.closed,
              href: supportReportsHref("closed"),
              current: statusFilter === "closed",
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

      {statusFilter !== "all" ? (
        <p className="mt-4 text-sm text-muted">
          Showing {statusFilter} reports.{" "}
          <Link
            href={supportReportsHref("all")}
            className="font-semibold text-brand-red hover:underline"
          >
            Show all
          </Link>
        </p>
      ) : null}

      {reports.error ? (
        <p className="mt-8 text-sm text-muted" role="alert">
          {reports.error}
        </p>
      ) : reports.reports.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No problem reports yet. They appear here after someone uses Support.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No {statusFilter} reports.{" "}
          <Link
            href={supportReportsHref("all")}
            className="font-semibold text-brand-red hover:underline"
          >
            Show all
          </Link>
        </p>
      ) : (
        <AdminSupportReportsQueue
          reports={visible.map((report) => ({
            id: report.id,
            reporterEmail: report.reporterEmail,
            body: report.body,
            status: report.status,
            createdAt: report.createdAt,
          }))}
        />
      )}
    </div>
  );
}
