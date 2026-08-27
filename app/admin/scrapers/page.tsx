import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminScraperControls } from "@/components/AdminScraperControls";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import {
  getAdminIngestionSourceHealth,
  getAdminOpsStats,
  getAdminScrapeRuns,
} from "@/lib/data/admin";
import { getGitHubIngestionConfig } from "@/lib/github-ingestion";
import { sourceNeedsOperationalAttention } from "@/lib/ingestion-sources";

export const metadata: Metadata = {
  title: "Admin scrapers",
  description: "Run tournament ingestion sources and inspect recent results.",
};

const HEALTH_LABEL: Record<string, string> = {
  healthy: "Healthy",
  warning: "Warning",
  failing: "Failing",
  blocked: "Blocked",
  paused: "Paused",
  not_configured: "Not configured",
};

export default async function AdminScrapersPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  const [runResult, github, stats, health] = await Promise.all([
    getAdminScrapeRuns(),
    Promise.resolve(getGitHubIngestionConfig()),
    getAdminOpsStats(),
    getAdminIngestionSourceHealth(),
  ]);

  const lastRunLabel = stats.ingestion.runsUnavailable
    ? null
    : stats.ingestion.lastRunStatus
      ? stats.ingestion.lastRunStatus === "succeeded"
        ? "Succeeded"
        : stats.ingestion.lastRunStatus === "failed"
          ? "Failed"
          : "Running"
      : "None yet";
  const issueCount = health.unavailable
    ? null
    : health.sources.filter((row) =>
        sourceNeedsOperationalAttention(row.source, row.health)
      ).length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Scrapers
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sources are grouped by competition type. Select one source, a whole
        category, or several at once; each request uses the existing ingestion
        workflow and records its result separately.
      </p>

      <div className="mt-8">
        <AdminStatStrip
          label="Ingestion"
          items={[
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
              label: "Runnable sources needing attention",
              value: issueCount,
              href: "/admin/scrapers#source-health",
            },
          ]}
        />
      </div>

      <section
        id="source-health"
        className="section-rule mt-10 scroll-mt-24 pt-8"
        aria-labelledby="source-health-heading"
      >
        <h2
          id="source-health-heading"
          className="text-sm font-semibold text-foreground"
        >
          Source health
        </h2>
        {health.unavailable ? (
          <p className="mt-3 text-sm text-muted" role="alert">
            Source health is unavailable. Reload this page and try again — do
            not treat missing scrapers as healthy.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line bg-surface">
            {health.sources.map((row) => (
              <li
                key={row.source.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <span className="text-sm font-semibold text-foreground">
                  {row.source.name}
                </span>
                <span className="text-sm text-muted-strong">
                  {HEALTH_LABEL[row.health.state] ?? row.health.state}
                  {row.health.message ? ` · ${row.health.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <AdminScraperControls
          runs={runResult.runs}
          runsUnavailable={runResult.unavailable}
          configured={github.ok}
          workflowUrl={github.ok ? github.config.workflowUrl : github.workflowUrl}
        />
      </div>
    </main>
  );
}
