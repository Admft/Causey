import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { CompetitionResult } from "@/lib/data/types";
import type { Section } from "@/lib/schemas";
import type { ResultsLayout } from "@/components/ResultsLayoutToggle";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import {
  dateChipParts,
  formatDateRange,
  formatDateRangeWithWeekday,
  formatFeeCents,
} from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";
import { eventStanding, isFeaturedStanding } from "@/lib/event-standing";
import { FeaturedAwardMark } from "@/components/FeaturedAwardMark";
import { isCompetitionEnded } from "@/lib/competition-timing";
import { SourceBadge } from "@/components/SourceBadge";

/**
 * Search-result card. Scans in three beats: standing + fee on the eyebrow
 * row, then a date chip anchoring when / where / who-can-play lines.
 * Entry fee stays on the top line — cost is an equity feature.
 * No empty image chrome: events without a cover or source logo go
 * text-first (schema contract), with the featured mark inline instead.
 */

/** Section names are the level language chess parents scan for (U900, K-8). */
function levelSummary(sections: Section[], maxNames = 3): string | null {
  if (sections.length === 0) return null;
  const shown = sections.slice(0, maxNames).map((s) => s.name);
  const extra = sections.length - shown.length;
  return extra > 0 ? `${shown.join(" · ")} · +${extra} more` : shown.join(" · ");
}

function placeLine(result: CompetitionResult): string {
  const where = result.venue_name
    ? `${result.venue_name} · ${result.city}, ${result.state}`
    : `${result.city}, ${result.state}`;
  return result.distance_miles !== null
    ? `${where} · ${formatMiles(result.distance_miles)} away`
    : where;
}

function DateChip({ start, small }: { start: string; small?: boolean }) {
  const { month, day } = dateChipParts(start);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-surface-soft ${
        small ? "h-10 w-10" : "h-11 w-11"
      }`}
    >
      <span className="text-2xs font-semibold uppercase leading-none tracking-[0.06em] text-brand-red">
        {month}
      </span>
      <span
        className={`mt-0.5 font-bold leading-none tabular-nums text-foreground ${
          small ? "text-sm" : "text-base"
        }`}
      >
        {day}
      </span>
    </span>
  );
}

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
  const sourceMeta = sourceByCompetitionSource(result.source);
  const hasVisual = Boolean(cover) || Boolean(sourceMeta);
  const standing = eventStanding({
    name: result.name,
    source: result.source,
    series: result.series,
  });
  const featured = isFeaturedStanding(standing);
  const ended = isCompetitionEnded(result);
  const levels = levelSummary(result.sections, compact ? 2 : 3);
  const pathwayHint =
    result.pathway_status === "uncertain"
      ? "Pathway unconfirmed"
      : result.pathway_status === "known"
        ? "Pathway on record"
        : null;
  // List rows have no footer — deadline / pathway / filter-match ride the level line.
  const listTail = [
    anyFilterActive
      ? `${result.matching_section_ids.length} of ${result.sections.length} match your filters`
      : null,
    result.reg_deadline ? `Register by ${formatDateRange(result.reg_deadline, null)}` : null,
    pathwayHint,
  ]
    .filter((p): p is string => p !== null)
    .join(" · ");

  const eyebrow = (
    <>
      {featured && !hasVisual ? <FeaturedAwardMark className="h-4 w-4" /> : null}
      <span className="text-brand-red">{standing.label}</span>
      {ended ? <span className="text-muted">· Ended</span> : null}
    </>
  );

  if (list) {
    return (
      <Link
        href={`/event/${result.slug}`}
        className="card-lift relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:gap-4"
      >
        {featured && hasVisual ? (
          <FeaturedAwardMark className="absolute left-2.5 top-2.5 z-10 h-7 w-7" />
        ) : null}
        {cover ? (
          <CompetitionCoverImage
            src={cover}
            alt=""
            aspectClass="aspect-[4/3] sm:aspect-auto"
            className="w-full shrink-0 rounded-lg sm:h-16 sm:w-24"
          />
        ) : sourceMeta ? (
          <Image
            src={sourceMeta.logoUrl}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="hidden h-16 w-16 shrink-0 rounded-lg sm:block"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs font-semibold uppercase tracking-[0.06em]">
            {eyebrow}
            <span className="ml-auto text-sm normal-case tracking-normal text-foreground">
              {formatFeeCents(result.entry_fee_cents)}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">
            {result.name}
          </h3>
          <div className="mt-1.5 flex items-start gap-2.5">
            <DateChip start={result.start_date} small />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {formatDateRangeWithWeekday(result.start_date, result.end_date)}
              </p>
              <p className="mt-0.5 text-xs text-muted">{placeLine(result)}</p>
              {levels || listTail ? (
                <p className="mt-0.5 text-xs text-muted-strong">
                  {levels}
                  {listTail ? (
                    <span className="text-muted">
                      {levels ? ` · ${listTail}` : listTail}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <span className="mt-1 block">
                <SourceBadge source={result.source} showLogo={false} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const footerParts: { text: string; strong?: boolean }[] = [];
  if (anyFilterActive) {
    footerParts.push({
      text: `${result.matching_section_ids.length} of ${result.sections.length} sections match your filters`,
      strong: true,
    });
  }
  if (result.reg_deadline) {
    footerParts.push({ text: `Register by ${formatDateRange(result.reg_deadline, null)}` });
  }
  if (pathwayHint) {
    footerParts.push({ text: pathwayHint });
  }

  return (
    <Link
      href={`/event/${result.slug}`}
      className="card-lift relative block overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
    >
      {hasVisual && (
        <>
          {featured ? (
            <FeaturedAwardMark className="absolute left-3 top-3 z-10 h-8 w-8" />
          ) : null}
          {cover ? (
            <CompetitionCoverImage
              src={cover}
              alt=""
              aspectClass={compact ? "aspect-[16/9]" : "aspect-[16/10]"}
            />
          ) : sourceMeta ? (
            <div
              className={`flex items-center justify-center bg-surface-soft ${
                compact ? "aspect-[16/9]" : "aspect-[16/10]"
              }`}
            >
              <Image
                src={sourceMeta.logoUrl}
                alt=""
                width={72}
                height={72}
                unoptimized
                className="h-[4.5rem] w-[4.5rem] rounded-xl"
              />
            </div>
          ) : null}
        </>
      )}
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center justify-between gap-3 text-2xs font-semibold uppercase tracking-[0.06em]">
          <p className="flex min-w-0 items-center gap-1.5">{eyebrow}</p>
          <span
            className={`shrink-0 normal-case tracking-normal text-foreground ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
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
        <div className={`flex items-start ${compact ? "mt-2.5 gap-2.5" : "mt-3 gap-3"}`}>
          <DateChip start={result.start_date} small={compact} />
          <div className="min-w-0">
            <p
              className={`font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}
            >
              {formatDateRangeWithWeekday(result.start_date, result.end_date)}
            </p>
            <p className={`mt-0.5 text-muted ${compact ? "text-2xs" : "text-xs"}`}>
              {placeLine(result)}
            </p>
            {levels ? (
              <p
                className={`mt-0.5 font-medium text-muted-strong ${
                  compact ? "text-2xs" : "text-xs"
                }`}
              >
                {levels}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={`flex flex-wrap items-center gap-x-2 border-t border-line text-2xs text-muted ${
            compact ? "mt-2.5 pt-2" : "mt-3 pt-3"
          }`}
        >
          <SourceBadge source={result.source} showLogo={false} />
          {footerParts.length > 0 ? <span aria-hidden="true">·</span> : null}
          {footerParts.map((part, i): ReactNode => (
            <span key={part.text} className={part.strong ? "text-muted-strong" : undefined}>
              {i > 0 ? " · " : ""}
              {part.text}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
