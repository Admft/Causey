import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBarChart, AdminMixChart } from "@/components/AdminCharts";
import { AdminScraperControls } from "@/components/AdminScraperControls";
import { AdminStatStrip } from "@/components/AdminStatStrip";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { scrapeRunBarValue, scrapeRunTone } from "@/lib/admin-charts";
import {
  formatIngestionLastRun,
  getAdminIngestionSourceHealth,
  getAdminScrapeRuns,
} from "@/lib/data/admin";
import { getGitHubIngestionConfig } from "@/lib/github-ingestion";

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

  const [runResult, github, health] = await Promise.all([
    getAdminScrapeRuns(),
    Promise.resolve(getGitHubIngestionConfig()),
    getAdminIngestionSourceHealth(),
  ]);

  const lastRun = runResult.unavailable ? null : (runResult.runs[0] ?? null);
  const lastRunLabel = formatIngestionLastRun(
    lastRun?.status ?? null,
    runResult.unavailable
  );
  const lastRowsUpserted =
    runResult.unavailable || !lastRun ? null : lastRun.rows_upserted;
  const issueCount = health.unavailable
    ? null
    : health.sources.filter(
        (row) =>
          row.health.state === "failing" ||
          row.health.state === "warning" ||
          row.health.state === "blocked"
      ).length;

  const healthCounts: Record<string, number> = {
    healthy: 0,
    warning: 0,
    failing: 0,
    blocked: 0,
    paused: 0,
    not_configured: 0,
  };
  if (!health.unavailable) {
    for (const row of health.sources) {
      healthCounts[row.health.state] += 1;
    }
  }
  const healthSegments = (
    [
      ["healthy", "ok"],
      ["warning", "progress"],
      ["failing", "attention"],
      ["blocked", "attention"],
      ["paused", "quiet"],
      ["not_configured", "quiet"],
    ] as const
  ).map(([state, tone]) => ({
    label: HEALTH_LABEL[state],
    value: health.unavailable ? null : healthCounts[state],
    tone,
  }));
  const runSegments = runResult.unavailable
    ? [{ label: "Runs", value: null as number | null, tone: "quiet" as const }]
    : [...runResult.runs].slice(0, 12).reverse().map((run) => ({
        label: new Date(run.started_at).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        value: scrapeRunBarValue(run),
        tone: scrapeRunTone(run.status),
      }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
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
              value: lastRowsUpserted,
              href: "/admin/scrapers",
            },
            {
              label: "Sources with issues",
              value: issueCount,
              href: "/admin/scrapers#source-health",
            },
          ]}
          chart={
            <div className="grid gap-6 sm:grid-cols-2">
              <AdminMixChart title="Source health" segments={healthSegments} />
              <AdminBarChart
                title="Rows upserted"
                unit="rows"
                segments={runSegments}
              />
            </div>
          }
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
    </div>
  );
}
