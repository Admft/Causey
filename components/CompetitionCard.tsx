import Link from "next/link";
import type { CompetitionResult } from "@/lib/data/types";
import type { ResultsLayout } from "@/components/ResultsLayoutToggle";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import { formatMiles } from "@/lib/geo";

/**
 * Search-result card. Layout prop densifies for list / 2×2 / 3×3 grids.
 * Entry fee stays on the top line — cost is an equity feature.
 * Cover images are optional: missing/broken URLs leave the text card alone.
 */
export function CompetitionCard({
  result,
  layout = "grid2",
}: {
  result: CompetitionResult;
  layout?: ResultsLayout;
}) {
  const anyFilterActive = result.matching_section_ids.length !== result.sections.length;
  const compact = layout === "grid3";
  const list = layout === "list";
  const cover = result.image_url;

  if (list) {
    return (
      <Link
        href={`/event/${result.slug}`}
        className="card-lift flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:gap-4"
      >
        {cover ? (
          <CompetitionCoverImage
            src={cover}
            alt=""
            aspectClass="aspect-[4/3] sm:aspect-auto"
            className="w-full shrink-0 rounded-lg sm:h-16 sm:w-24"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
                Chess
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatFeeCents(result.entry_fee_cents)}
              </span>
            </div>
            <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">
              {result.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateRange(result.start_date, result.end_date)} · {result.city},{" "}
              {result.state}
              {result.distance_miles !== null && <> · {formatMiles(result.distance_miles)} away</>}
            </p>
          </div>
          <p className="shrink-0 text-2xs text-muted sm:text-right">
            {result.sections.length} section{result.sections.length === 1 ? "" : "s"}
            {anyFilterActive && (
              <>
                {" "}
                ·{" "}
                <span className="text-muted-strong">
                  {result.matching_section_ids.length} match
                </span>
              </>
            )}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/event/${result.slug}`}
      className="card-lift block overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
    >
      <CompetitionCoverImage
        src={cover}
        alt=""
        aspectClass={compact ? "aspect-[16/9]" : "aspect-[16/10]"}
      />
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
            Chess
          </span>
          <span className={`font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {formatFeeCents(result.entry_fee_cents)}
          </span>
        </div>
        <h3
          className={`mt-1 font-semibold text-foreground ${
            compact ? "text-base leading-snug" : "text-lead"
          }`}
        >
          {result.name}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {formatDateRange(result.start_date, result.end_date)} · {result.city},{" "}
          {result.state}
          {result.distance_miles !== null && <> · {formatMiles(result.distance_miles)} away</>}
        </p>
        <div
          className={`border-t border-line text-2xs text-muted ${
            compact ? "mt-2 pt-2" : "mt-3 pt-3"
          }`}
        >
          {result.sections.length} section{result.sections.length === 1 ? "" : "s"}
          {anyFilterActive && (
            <>
              {" "}
              ·{" "}
              <span className="text-muted-strong">
                {result.matching_section_ids.length} match your filters
              </span>
            </>
          )}
          {result.reg_deadline && <> · register by {formatDateRange(result.reg_deadline, null)}</>}
        </div>
      </div>
    </Link>
  );
}
