"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTournamentStatusActions } from "@/components/AdminTournamentStatusActions";
import { adminBulkSetTournamentStatus } from "@/lib/actions/admin";
import { formatDateRange } from "@/lib/format";
import { competitionSourceLabel } from "@/lib/ingestion-sources";

type TournamentStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived";

type BulkTournament = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  start_date: string;
  end_date: string | null;
  reg_url: string | null;
  source: string;
  status: TournamentStatus;
  publishReady: boolean;
  organizations: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const BULK_CAP = 100;

export function AdminTournamentBulkList({
  tournaments,
  filterStatus,
  filterSource,
}: {
  tournaments: BulkTournament[];
  filterStatus?: string;
  filterSource?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectableIds = useMemo(
    () => tournaments.slice(0, BULK_CAP).map((row) => row.id),
    [tournaments]
  );
  const readyDraftIds = useMemo(
    () =>
      tournaments
        .filter((row) => row.status === "draft" && row.publishReady)
        .slice(0, BULK_CAP)
        .map((row) => row.id),
    [tournaments]
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));
  const selectedCount = selected.size;
  const canPublishGroup =
    filterStatus === "draft" && Boolean(filterSource) && readyDraftIds.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < BULK_CAP) next.add(id);
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

  async function publishIds(ids: string[], label: string) {
    if (!ids.length) return;
    if (
      !window.confirm(
        `Publish ${ids.length} ${label}? Complete records will appear in chess search right away.`
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminBulkSetTournamentStatus({
        competitionIds: ids,
        status: "published",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      const publishedLabel =
        result.updated === 1 ? "tournament" : "tournaments";
      setMessage(
        result.skipped > 0
          ? `Published ${result.updated}; ${result.skipped} could not be updated.`
          : filterStatus === "draft"
            ? `Published ${result.updated} ${publishedLabel}. They left this Draft list — filter to Published to see them. Chess search only shows upcoming listings; switch Timing to All for events that already ended.`
            : `Published ${result.updated} ${publishedLabel}. They stay here as Published. Chess search only shows upcoming listings; switch Timing to All for events that already ended.`
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-muted-strong">
            <input
              type="checkbox"
              className="size-4 rounded border-line"
              checked={allSelected}
              onChange={toggleAll}
              disabled={!selectableIds.length || pending}
            />
            Select all shown
            {tournaments.length > BULK_CAP
              ? ` (first ${BULK_CAP})`
              : ""}
          </label>
          {readyDraftIds.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setSelected(new Set(readyDraftIds));
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
            >
              Select {readyDraftIds.length} ready draft
              {readyDraftIds.length === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
        {canPublishGroup ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              publishIds(
                readyDraftIds,
                `ready draft${readyDraftIds.length === 1 ? "" : "s"} from ${competitionSourceLabel(filterSource!)}`
              )
            }
            className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            {pending
              ? "Publishing…"
              : `Publish ${readyDraftIds.length} ready draft${readyDraftIds.length === 1 ? "" : "s"}`}
          </button>
        ) : null}
      </div>

      {(selectedCount > 0 || error || message) && (
        <div className="sticky bottom-4 z-20 mt-4 rounded-xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-strong">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : message ?? "Bulk actions"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {selectedCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    publishIds([...selected], "selected tournament(s)")
                  }
                  className="cta-enabled disabled:opacity-60"
                >
                  {pending ? "Publishing…" : "Publish selected"}
                </button>
              ) : null}
              {selectedCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSelected(new Set())}
                  className="text-sm font-semibold text-muted-strong hover:text-foreground disabled:opacity-60"
                >
                  Clear selection
                </button>
              ) : null}
            </div>
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

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {tournaments.map((tournament) => (
          <li
            key={tournament.id}
            className="grid gap-3 px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <label className="flex items-start pt-1">
              <input
                type="checkbox"
                className="size-4 rounded border-line"
                checked={selected.has(tournament.id)}
                onChange={() => toggle(tournament.id)}
                disabled={
                  pending ||
                  (!selected.has(tournament.id) && selected.size >= BULK_CAP)
                }
                aria-label={`Select ${tournament.name}`}
              />
            </label>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {tournament.status === "published" ? (
                  <Link
                    href={`/event/${tournament.slug}`}
                    className="font-semibold text-foreground hover:text-brand-red"
                  >
                    {tournament.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">
                    {tournament.name}
                  </span>
                )}
                <span
                  className={
                    tournament.status === "published"
                      ? "rounded-md border border-brand-red/30 bg-accent-soft px-1.5 py-0.5 text-2xs font-semibold text-brand-red"
                      : "rounded-md border border-line px-1.5 py-0.5 text-2xs font-semibold text-muted-strong"
                  }
                >
                  {STATUS_LABELS[tournament.status] ?? tournament.status}
                </span>
                {tournament.status === "draft" && tournament.publishReady ? (
                  <span className="rounded-md border border-brand-red/30 bg-accent-soft px-1.5 py-0.5 text-2xs font-semibold text-brand-red">
                    Ready to publish
                  </span>
                ) : null}
                {tournament.status === "draft" && !tournament.publishReady ? (
                  <span className="rounded-md border border-line px-1.5 py-0.5 text-2xs font-semibold text-muted">
                    Needs details
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatDateRange(tournament.start_date, tournament.end_date)}
                {` · ${tournament.city}, ${tournament.state}`}
                {` · ${competitionSourceLabel(tournament.source)}`}
                {tournament.organizations
                  ? ` · ${tournament.organizations.name}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 lg:justify-end">
              <Link
                href={`/admin/tournaments/${tournament.id}/edit`}
                className="text-sm font-semibold text-foreground hover:text-brand-red"
              >
                Edit
              </Link>
              <AdminTournamentStatusActions
                competitionId={tournament.id}
                eventSlug={tournament.slug}
                status={tournament.status}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
