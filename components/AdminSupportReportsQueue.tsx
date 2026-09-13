"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateSupportReports } from "@/lib/actions/support";
import { attemptAction } from "@/lib/attempt-action";
import {
  SUPPORT_BULK_CAP,
  type SupportReportStatus,
} from "@/lib/support";

export type AdminSupportQueueRow = {
  id: string;
  reporterEmail: string;
  body: string;
  status: SupportReportStatus;
  createdAt: string;
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

function statusLabel(status: SupportReportStatus) {
  if (status === "open") return "Open";
  if (status === "replied") return "Replied";
  return "Closed";
}

export function AdminSupportReportsQueue({
  reports,
}: {
  reports: AdminSupportQueueRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<"close" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectableIds = useMemo(
    () => reports.slice(0, SUPPORT_BULK_CAP).map((row) => row.id),
    [reports]
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));
  const selectedCount = selected.size;
  const selectedClosedCount = useMemo(
    () =>
      reports.filter((row) => selected.has(row.id) && row.status === "closed")
        .length,
    [reports, selected]
  );
  const selectedOpenCount = selectedCount - selectedClosedCount;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < SUPPORT_BULK_CAP) next.add(id);
      return next;
    });
    setError(null);
    setMessage(null);
  }

  function toggleAll() {
    setSelected((prev) => {
      if (selectableIds.every((id) => prev.has(id))) return new Set();
      return new Set(selectableIds);
    });
    setError(null);
    setMessage(null);
  }

  async function run(action: "close" | "reopen") {
    if (!selectedCount) return;
    if (action === "close" && selectedOpenCount === 0) {
      setError("Those reports are already closed.");
      return;
    }
    if (action === "reopen" && selectedClosedCount === 0) {
      setError("Reopen is for closed reports. Open one that is already closed.");
      return;
    }
    if (
      action === "close" &&
      !window.confirm(
        `Close ${selectedOpenCount} report${selectedOpenCount === 1 ? "" : "s"}? Nobody is emailed.`
      )
    ) {
      return;
    }

    setPending(action);
    setError(null);
    setMessage(null);
    try {
      const result = await attemptAction(() =>
        bulkUpdateSupportReports({
          reportIds: [...selected],
          action,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      const verb = action === "close" ? "Closed" : "Reopened";
      setMessage(
        result.skipped > 0
          ? `${verb} ${result.updated}; ${result.skipped} were already in that state.`
          : `${verb} ${result.updated} report${result.updated === 1 ? "" : "s"}.`
      );
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-strong">
          <input
            type="checkbox"
            className="size-4 rounded border-line"
            checked={allSelected}
            onChange={toggleAll}
            disabled={!selectableIds.length || pending !== null}
          />
          Select all
          {reports.length > SUPPORT_BULK_CAP
            ? ` (first ${SUPPORT_BULK_CAP})`
            : ""}
        </label>
        <span className="text-xs text-muted">
          {reports.length} shown
        </span>
      </div>

      {(selectedCount > 0 || error || message) && (
        <div className="sticky top-[4.5rem] z-20 mt-4 rounded-xl border border-line bg-surface/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : "Bulk actions"}
            </p>
            {selectedCount > 0 ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void run("close")}
                  className="cta-enabled disabled:opacity-60"
                >
                  {pending === "close" ? "Closing…" : "Close selected"}
                </button>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void run("reopen")}
                  className="action-button"
                >
                  {pending === "reopen" ? "Reopening…" : "Reopen selected"}
                </button>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => setSelected(new Set())}
                  className="action-button"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="mt-2 text-sm font-medium text-brand-red" role="alert">
              {error}
            </p>
          ) : null}
          {message && selectedCount === 0 ? (
            <p className="mt-2 text-sm text-muted" role="status">
              {message}
            </p>
          ) : null}
        </div>
      )}

      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {reports.map((report) => (
          <li key={report.id} className="flex items-start gap-3 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-line"
              checked={selected.has(report.id)}
              onChange={() => toggle(report.id)}
              disabled={
                pending !== null ||
                (!selected.has(report.id) && selected.size >= SUPPORT_BULK_CAP)
              }
              aria-label={`Select report from ${report.reporterEmail}`}
            />
            <div className="min-w-0 flex-1">
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
