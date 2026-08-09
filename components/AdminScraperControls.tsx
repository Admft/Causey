"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_SCRAPER_OPTIONS,
  adminScraperLabel,
  type AdminScraperSource,
} from "@/lib/admin-scrapers";
import { adminRunScraper } from "@/lib/actions/admin-operations";
import type { AdminScrapeRunRow } from "@/lib/data/admin";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

const STATUS_LABELS: Record<AdminScrapeRunRow["status"], string> = {
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
};

export function AdminScraperControls({
  runs,
  configured,
  workflowUrl,
}: {
  runs: AdminScrapeRunRow[];
  configured: boolean;
  workflowUrl: string | null;
}) {
  const router = useRouter();
  const [source, setSource] = useState<AdminScraperSource>("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runScraper() {
    const label = adminScraperLabel(source);
    if (
      !window.confirm(
        `Run ${label} now? The scraper may add new tournaments and update existing source listings.`
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminRunScraper({ source });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `${adminScraperLabel(result.source)} was sent to GitHub Actions. It can take a minute to appear below.`
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-foreground">
              Tournament source
            </span>
            <select
              className="field mt-2 w-full"
              value={source}
              disabled={pending}
              onChange={(event) => {
                setSource(event.target.value as AdminScraperSource);
                setError(null);
                setMessage(null);
              }}
            >
              {ADMIN_SCRAPER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="cta-enabled disabled:opacity-60"
            disabled={pending || !configured}
            onClick={runScraper}
          >
            {pending ? "Sending request…" : "Run selected scraper"}
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Scrapers run in the existing ingestion workflow, outside the web
          request. New complete listings may publish immediately; incomplete
          listings stay in Drafts for review. If another run is active, this
          request waits for it instead of running at the same time.
        </p>
        {!configured ? (
          <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
            Scraper runs are unavailable on this deployment. Ask the deployment
            owner to review ingestion access.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-muted-strong" role="status">
            {message}{" "}
            {workflowUrl ? (
              <a
                href={workflowUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-red hover:underline"
                aria-label="Open the ingestion workflow in GitHub Actions (opens in a new tab)"
              >
                Open workflow ↗
              </a>
            ) : null}
          </p>
        ) : null}
      </section>

      <section className="section-rule mt-8 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Recent runs</h2>
          {workflowUrl ? (
            <a
              href={workflowUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
              aria-label="View all ingestion workflow runs in GitHub Actions (opens in a new tab)"
            >
              View all in GitHub ↗
            </a>
          ) : null}
        </div>
        {!runs.length ? (
          <p className="mt-4 text-sm text-muted">
            No scraper runs are recorded yet. Run one source above to start the
            activity log.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {runs.map((run) => (
              <li
                key={run.id}
                className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {adminScraperLabel(run.source)}
                    </p>
                    <span
                      className={
                        run.status === "failed"
                          ? "rounded-md border border-brand-red/30 px-1.5 py-0.5 text-2xs font-semibold text-brand-red"
                          : "rounded-md border border-line px-1.5 py-0.5 text-2xs font-semibold text-muted-strong"
                      }
                    >
                      {STATUS_LABELS[run.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Started {DATE_FORMATTER.format(new Date(run.started_at))}
                    {run.finished_at
                      ? ` · Finished ${DATE_FORMATTER.format(new Date(run.finished_at))}`
                      : ""}
                  </p>
                  {run.error ? (
                    <p className="mt-2 text-sm text-brand-red">{run.error}</p>
                  ) : null}
                </div>
                <p className="text-xs text-muted md:text-right">
                  {run.rows_staged === null
                    ? "Rows pending"
                    : `${run.rows_staged} staged`}
                  {run.rows_upserted === null
                    ? ""
                    : ` · ${run.rows_upserted} upserted`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
