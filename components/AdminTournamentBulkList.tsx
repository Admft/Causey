"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTournamentStatusActions } from "@/components/AdminTournamentStatusActions";
import { adminBulkSetTournamentStatus } from "@/lib/actions/admin";
import {
  adminDeleteAllTournaments,
  adminDeleteTournaments,
} from "@/lib/actions/admin-operations";
import { formatDateRange } from "@/lib/format";
import { competitionSourceLabel } from "@/lib/ingestion-sources";
import { competitionTypeLabel } from "@/lib/competition-types";
import type { CompetitionCategory } from "@/lib/schemas";

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
  category: CompetitionCategory;
  custom_category_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
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
  totalTournamentCount,
}: {
  tournaments: BulkTournament[];
  filterStatus?: string;
  filterSource?: string;
  totalTournamentCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "publish" | "delete" | "delete-all" | null
  >(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");

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
        `Publish ${ids.length} ${label}? Chess records will appear in chess search; other types remain available by direct link until their public directories open.`
      )
    ) {
      return;
    }
    setPending(true);
    setPendingAction("publish");
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
            ? `Published ${result.updated} ${publishedLabel}. They left this Draft list — filter to Published to see them. Chess search shows upcoming chess listings; non-chess directories remain closed.`
            : `Published ${result.updated} ${publishedLabel}. They stay here as Published. Chess search shows upcoming chess listings; non-chess directories remain closed.`
      );
      router.refresh();
    } finally {
      setPending(false);
      setPendingAction(null);
    }
  }

  async function deleteIds(ids: string[], label: string) {
    if (!ids.length) return;
    if (
      !window.confirm(
        `Permanently delete ${label}? This also removes related saved plans, RSVPs, attendance, sections, and change history. This cannot be undone.`
      )
    ) {
      return;
    }

    setPending(true);
    setPendingAction("delete");
    setDeletingIds(new Set(ids));
    setError(null);
    setMessage(null);
    try {
      const result = await adminDeleteTournaments({ competitionIds: ids });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setMessage(
        result.skipped > 0
          ? `Deleted ${result.deleted}; ${result.skipped} were already gone.`
          : `Deleted ${result.deleted} tournament${result.deleted === 1 ? "" : "s"}.`
      );
      router.refresh();
    } finally {
      setPending(false);
      setPendingAction(null);
      setDeletingIds(new Set());
    }
  }

  async function deleteEveryTournament() {
    setPending(true);
    setPendingAction("delete-all");
    setError(null);
    setMessage(null);
    try {
      const result = await adminDeleteAllTournaments({
        confirmation: deleteAllConfirmation,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setDeleteAllConfirmation("");
      setConfirmingDeleteAll(false);
      setMessage(
        `Deleted ${result.deleted} tournament${result.deleted === 1 ? "" : "s"}. Scrapers can add source listings again on their next run.`
      );
      router.refresh();
    } finally {
      setPending(false);
      setPendingAction(null);
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
            {pendingAction === "publish"
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
                  {pendingAction === "publish"
                    ? "Publishing…"
                    : "Publish selected"}
                </button>
              ) : null}
              {selectedCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    deleteIds(
                      [...selected],
                      `${selectedCount} selected tournament${selectedCount === 1 ? "" : "s"}`
                    )
                  }
                  className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
                >
                  {pendingAction === "delete"
                    ? "Deleting…"
                    : "Delete selected"}
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
                {competitionTypeLabel({
                  category: tournament.category,
                  customCategoryName: tournament.custom_category_name,
                })}
                {" · "}
                {formatDateRange(tournament.start_date, tournament.end_date)}
                {tournament.city && tournament.state
                  ? ` · ${tournament.city}, ${tournament.state}`
                  : ""}
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
              <button
                type="button"
                disabled={pending}
                onClick={() => deleteIds([tournament.id], `"${tournament.name}"`)}
                className="text-sm font-medium text-muted-strong hover:text-brand-red disabled:opacity-60"
              >
                {deletingIds.has(tournament.id) ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8 border-t border-line pt-6">
        <h3 className="text-sm font-semibold text-foreground">
          Delete every tournament
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Permanently remove all {totalTournamentCount} tournament records and
          their related plans, RSVPs, attendance, sections, and history.
          Scheduled or manual scrapers can add source listings again.
        </p>
        {!confirmingDeleteAll ? (
          <button
            type="button"
            disabled={pending || totalTournamentCount === 0}
            onClick={() => {
              setConfirmingDeleteAll(true);
              setError(null);
              setMessage(null);
            }}
            className="mt-3 text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
          >
            Delete all {totalTournamentCount} tournaments
          </button>
        ) : (
          <div className="mt-4 max-w-xl rounded-xl border border-line bg-surface-soft p-4">
            <label className="block text-sm font-medium text-foreground">
              Type DELETE ALL TOURNAMENTS to confirm
              <input
                className="field mt-2 w-full"
                value={deleteAllConfirmation}
                onChange={(event) =>
                  setDeleteAllConfirmation(event.target.value)
                }
                disabled={pending}
                autoComplete="off"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={
                  pending ||
                  deleteAllConfirmation !== "DELETE ALL TOURNAMENTS"
                }
                onClick={deleteEveryTournament}
                className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
              >
                {pendingAction === "delete-all"
                  ? "Deleting every tournament…"
                  : "Permanently delete every tournament"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmingDeleteAll(false);
                  setDeleteAllConfirmation("");
                }}
                className="text-sm font-semibold text-muted-strong hover:text-foreground disabled:opacity-60"
              >
                Keep tournaments
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
