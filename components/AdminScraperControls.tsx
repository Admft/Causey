"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_RUNNABLE_SCRAPER_SOURCES,
  adminScraperCategoryGroups,
  adminScraperCategoryLabel,
  adminScraperLabel,
  type AdminRunnableScraperSource,
} from "@/lib/admin-scrapers";
import { adminRunScraper } from "@/lib/actions/admin-operations";
import { attemptAction } from "@/lib/attempt-action";
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

const CATEGORY_GROUPS = adminScraperCategoryGroups();

function selectedSummary(selected: AdminRunnableScraperSource[]): string {
  if (!selected.length) return "No sources selected";
  if (selected.length === 1) return adminScraperLabel(selected[0]);
  if (selected.length === ADMIN_RUNNABLE_SCRAPER_SOURCES.length) {
    return "All currently runnable sources";
  }
  return `${selected.length} sources selected`;
}

export function AdminScraperControls({
  runs,
  runsUnavailable = false,
  configured,
  workflowUrl,
}: {
  runs: AdminScrapeRunRow[];
  runsUnavailable?: boolean;
  configured: boolean;
  workflowUrl: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<AdminRunnableScraperSource>>(
    () => new Set()
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedList = useMemo(
    () =>
      ADMIN_RUNNABLE_SCRAPER_SOURCES.filter((source) => selected.has(source)),
    [selected]
  );

  function clearFeedback() {
    setError(null);
    setMessage(null);
  }

  function toggleSource(source: AdminRunnableScraperSource) {
    clearFeedback();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  function toggleCategory(sources: readonly AdminRunnableScraperSource[]) {
    clearFeedback();
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = sources.every((source) => next.has(source));
      for (const source of sources) {
        if (allSelected) next.delete(source);
        else next.add(source);
      }
      return next;
    });
  }

  async function runSelected() {
    if (!selectedList.length) {
      setError("Select at least one scraper.");
      setMessage(null);
      return;
    }

    const label = selectedSummary(selectedList);
    if (
      !window.confirm(
        `Run ${label} now? The scraper${selectedList.length === 1 ? "" : "s"} may add new tournaments and update existing source listings.`
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await attemptAction(() =>
        adminRunScraper({ sources: selectedList })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const dispatched = result.sources;
      setMessage(
        dispatched.length === 1 && dispatched[0] === "all"
          ? "All currently runnable sources were sent to GitHub Actions. It can take a minute to appear below."
          : dispatched.length === 1
            ? `${adminScraperLabel(dispatched[0])} was sent to GitHub Actions. It can take a minute to appear below.`
            : `${dispatched.length} scrapers were sent to one GitHub Actions run. They run sequentially and can take a minute to appear below.`
      );
      if (result.auditWarning) setError(result.auditWarning);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <p className="text-sm font-semibold text-foreground">
              Selected sources
            </p>
            <p className="mt-1 text-sm text-muted-strong">
              {selectedSummary(selectedList)}
            </p>
          </div>
          <button
            type="button"
            className="cta-enabled disabled:opacity-60"
            disabled={pending || !configured || selectedList.length === 0}
            onClick={runSelected}
          >
            {pending
              ? "Sending request…"
              : selectedList.length <= 1
                ? "Run selected scraper"
                : `Run ${selectedList.length} scrapers`}
          </button>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Scrapers run in the existing ingestion workflow, outside the web
          request. New complete listings may publish immediately; incomplete
          listings stay in Drafts for review. If another run is active, later
          requests wait instead of running at the same time.
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
                rel="noopener noreferrer"
                className="font-semibold text-brand-red hover:underline"
                aria-label="Open the ingestion workflow in GitHub Actions (opens in a new tab)"
              >
                Open workflow ↗
              </a>
            ) : null}
          </p>
        ) : null}
      </section>

      <section
        className="section-rule mt-8 pt-8"
        aria-labelledby="scraper-sources-heading"
      >
        <h2
          id="scraper-sources-heading"
          className="text-sm font-semibold text-foreground"
        >
          Sources by competition type
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Check the scrapers you want, including whole categories, then run them
          from the control above.
        </p>

        <div className="mt-8 space-y-8">
          {CATEGORY_GROUPS.map((group) => {
            const values = group.options.map((option) => option.value);
            const selectedInCategory = values.filter((value) =>
              selected.has(value)
            ).length;
            const allInCategory =
              values.length > 0 && selectedInCategory === values.length;

            return (
              <div key={group.id} className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-xs font-semibold text-muted-strong">
                    {group.label}
                  </h3>
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
                    disabled={pending || values.length === 0}
                    onClick={() => toggleCategory(values)}
                  >
                    {allInCategory
                      ? `Clear ${group.label}`
                      : `Select all ${group.label}`}
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {group.options.map((option) => {
                    const checked = selected.has(option.value);
                    return (
                      <li key={option.value}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 py-3 transition-colors ${
                            checked ? "text-foreground" : "text-muted-strong"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 rounded border-line"
                            value={option.value}
                            checked={checked}
                            disabled={pending}
                            onChange={() => toggleSource(option.value)}
                          />
                          <span
                            className={`text-sm ${
                              checked ? "font-semibold text-foreground" : ""
                            }`}
                          >
                            {option.label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-rule mt-8 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Recent runs</h2>
          {workflowUrl ? (
            <a
              href={workflowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-muted-strong hover:text-brand-red"
              aria-label="View all ingestion workflow runs in GitHub Actions (opens in a new tab)"
            >
              View all in GitHub ↗
            </a>
          ) : null}
        </div>
        {runsUnavailable ? (
          <p className="mt-4 text-sm text-muted" role="alert">
            Recent runs are unavailable. Reload this page and try again — do not
            treat a missing log as an empty history.
          </p>
        ) : !runs.length ? (
          <p className="mt-4 text-sm text-muted">
            No scraper runs are recorded yet. Run one or more sources above to
            start the activity log.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {runs.map((run) => {
              const categoryLabel = adminScraperCategoryLabel(run.source);
              return (
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
                      {categoryLabel ? `${categoryLabel} · ` : ""}
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
