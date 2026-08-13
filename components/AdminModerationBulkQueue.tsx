"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModerationReviewForm } from "@/components/ModerationReviewForm";
import { adminBulkReviewTournaments } from "@/lib/actions/admin";
import { competitionTypeLabel } from "@/lib/competition-types";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import { competitionSourceLabel } from "@/lib/ingestion-sources";
import type { CompetitionCategory, ParticipationMode } from "@/lib/schemas";

type QueueRow = {
  id: string;
  slug: string;
  name: string;
  category: CompetitionCategory;
  custom_category_name: string | null;
  participation_mode: ParticipationMode;
  organizer_name: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  entry_fee_cents: number | null;
  rated: boolean;
  audience: "public" | "district" | "school" | "invite_only";
  source: string;
  submitted_for_review_at: string | null;
  organizations: {
    name: string;
    verification_status: "pending" | "verified" | "rejected";
  } | null;
};

const VERIFICATION_LABELS = {
  pending: "Organization verification pending",
  verified: "Verified organization",
  rejected: "Organization verification rejected",
} as const;

const BULK_CAP = 100;

export function AdminModerationBulkQueue({ queue }: { queue: QueueRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectableIds = useMemo(
    () => queue.slice(0, BULK_CAP).map((row) => row.id),
    [queue]
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));
  const selectedCount = selected.size;

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

  async function review(decision: "approve" | "reject") {
    if (!selectedCount) return;
    if (decision === "reject" && !note.trim()) {
      setError("Add a review note explaining what needs correction.");
      return;
    }
    if (
      decision === "approve" &&
      !window.confirm(
        `Publish ${selectedCount} competition${selectedCount === 1 ? "" : "s"}? Their public links become available immediately; only searchable types enter a directory.`
      )
    ) {
      return;
    }

    setPending(decision);
    setError(null);
    setMessage(null);
    try {
      const result = await adminBulkReviewTournaments({
        competitionIds: [...selected],
        decision,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setNote("");
      setMessage(
        result.skipped > 0
          ? `${decision === "approve" ? "Published" : "Rejected"} ${result.updated}; ${result.skipped} were no longer awaiting review.`
          : `${decision === "approve" ? "Published" : "Rejected"} ${result.updated} competition${result.updated === 1 ? "" : "s"}.`
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
          Select all in queue
          {queue.length > BULK_CAP ? ` (first ${BULK_CAP})` : ""}
        </label>
        <span className="text-xs text-muted">{queue.length} awaiting review</span>
      </div>

      {(selectedCount > 0 || error || message) && (
        <div className="sticky top-[4.5rem] z-20 mt-4 rounded-xl border border-line bg-surface/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {selectedCount > 0
                  ? `${selectedCount} selected`
                  : "Bulk review"}
              </p>
              {selectedCount > 0 ? (
                <label className="mt-2 block">
                  <span className="text-xs font-semibold text-muted-strong">
                    Review note (required to reject)
                  </span>
                  <textarea
                    className="field mt-1 min-h-16 resize-y"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Applies to every selected listing when rejecting."
                    maxLength={1000}
                    disabled={pending !== null}
                  />
                </label>
              ) : null}
            </div>
            {selectedCount > 0 ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => review("approve")}
                  className="cta-enabled disabled:opacity-60"
                >
                  {pending === "approve"
                    ? "Publishing…"
                    : "Approve and publish selected"}
                </button>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => review("reject")}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/35 hover:text-brand-red disabled:opacity-60"
                >
                  {pending === "reject" ? "Rejecting…" : "Reject selected"}
                </button>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => setSelected(new Set())}
                  className="text-sm font-semibold text-muted-strong hover:text-foreground disabled:opacity-60"
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

      <ul className="mt-5 grid gap-5 lg:grid-cols-2">
        {queue.map((tournament) => (
          <li
            key={tournament.id}
            className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-line"
                checked={selected.has(tournament.id)}
                onChange={() => toggle(tournament.id)}
                disabled={
                  pending !== null ||
                  (!selected.has(tournament.id) && selected.size >= BULK_CAP)
                }
                aria-label={`Select ${tournament.name}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted">
                  {tournament.organizations?.name ?? "Organizer submission"}
                  {tournament.organizations
                    ? ` · ${
                        VERIFICATION_LABELS[
                          tournament.organizations.verification_status
                        ]
                      }`
                    : ""}
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                  {tournament.name}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Submitted by {tournament.organizer_name ?? "an organizer"}
                  {tournament.submitted_for_review_at
                    ? ` · submitted ${new Date(
                        tournament.submitted_for_review_at
                      ).toLocaleDateString("en-US")}`
                    : ""}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-strong">
                  {competitionTypeLabel({
                    category: tournament.category,
                    customCategoryName: tournament.custom_category_name,
                  })}
                  {" · "}
                  {tournament.participation_mode === "in_person"
                    ? "In person"
                    : tournament.participation_mode === "online"
                      ? "Online"
                      : "Hybrid"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {tournament.category === "other"
                    ? "Discovery after approval: public link only; custom types are not in a category directory"
                    : `Discovery after approval: ${competitionTypeLabel({
                        category: tournament.category,
                        customCategoryName: tournament.custom_category_name,
                      })} directory`}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-x-5 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted">Date</dt>
                <dd className="mt-0.5 text-foreground">
                  {formatDateRange(tournament.start_date, tournament.end_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Place</dt>
                <dd className="mt-0.5 text-foreground">
                  {tournament.participation_mode === "online"
                    ? "Online"
                    : [
                        tournament.venue_name,
                        [tournament.city, tournament.state]
                          .filter(Boolean)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Location not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Source</dt>
                <dd className="mt-0.5 text-foreground">
                  {competitionSourceLabel(tournament.source)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">
                  Requested audience
                </dt>
                <dd className="mt-0.5 capitalize text-foreground">
                  {tournament.audience.replace("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Entry</dt>
                <dd className="mt-0.5 text-foreground">
                  {formatFeeCents(tournament.entry_fee_cents)}
                  {tournament.category === "chess"
                    ? tournament.rated
                      ? " · US Chess rated"
                      : " · Unrated"
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">
                  Registration
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {tournament.reg_url ? (
                    <>
                      <a
                        href={tournament.reg_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open registration for ${tournament.name} in a new tab`}
                        className="font-semibold text-muted-strong hover:text-brand-red"
                      >
                        Open organizer page ↗
                      </a>
                      {tournament.reg_deadline
                        ? ` · due ${formatDateRange(
                            tournament.reg_deadline,
                            null
                          )}`
                        : ""}
                    </>
                  ) : (
                    "Link not provided"
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 text-sm font-semibold">
              <Link
                href={`/admin/tournaments/${tournament.id}/edit`}
                className="text-muted-strong hover:text-foreground"
              >
                Check or edit the full record
              </Link>
            </div>
            <ModerationReviewForm
              competitionId={tournament.id}
              eventSlug={tournament.slug}
              tournamentName={tournament.name}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
