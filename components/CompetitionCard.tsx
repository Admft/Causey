import Link from "next/link";
import type { CompetitionResult } from "@/lib/data/types";
import { formatDateRange, formatFeeCents } from "@/lib/format";
import { formatMiles } from "@/lib/geo";

/**
 * Search-result card, styled like the marketing hero's competition cards
 * (design system §8.12): small red category caps, bold title, muted meta,
 * thin divider. The entry fee sits on the top line on purpose — cost is an
 * equity feature, never a surprise on the next page.
 */
export function CompetitionCard({ result }: { result: CompetitionResult }) {
  const anyFilterActive = result.matching_section_ids.length !== result.sections.length;
  return (
    <Link
      href={`/event/${result.slug}`}
      className="card-lift block rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
          Chess
        </span>
        <span className="text-sm font-semibold text-foreground">
          {formatFeeCents(result.entry_fee_cents)}
        </span>
      </div>
      <h3 className="mt-1 text-lead font-semibold text-foreground">{result.name}</h3>
      <p className="mt-1 text-xs text-muted">
        {formatDateRange(result.start_date, result.end_date)} · {result.city},{" "}
        {result.state}
        {result.distance_miles !== null && <> · {formatMiles(result.distance_miles)} away</>}
      </p>
      <div className="mt-3 border-t border-line pt-3 text-2xs text-muted">
        {result.sections.length} section{result.sections.length === 1 ? "" : "s"}
        {anyFilterActive && (
          <>
            {" "}
            · <span className="text-muted-strong">{result.matching_section_ids.length} match your filters</span>
          </>
        )}
        {result.reg_deadline && <> · register by {formatDateRange(result.reg_deadline, null)}</>}
      </div>
    </Link>
  );
}
