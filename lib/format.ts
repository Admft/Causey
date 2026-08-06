/** Display helpers shared across pages. */

/** null/undefined = not listed on the source page; 0 = free. */
export function formatFeeCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Fee not listed";
  if (cents === 0) return "No entry fee";
  return (cents / 100) % 1 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}

const GRADE_LABELS: Record<number, string> = { 0: "K" };
export function gradeLabel(grade: number): string {
  return GRADE_LABELS[grade] ?? String(grade);
}

function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function weekdayShort(iso: string): string {
  return parseIsoDay(iso).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function formatDate(iso: string): string {
  return parseIsoDay(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateRange(start: string, end: string | null): string {
  if (!end || end === start) return formatDate(start);
  const [ys, ms] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  if (ys === ye && ms === me) {
    return `${formatDate(start).replace(`, ${ys}`, "")}–${de}, ${ys}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Range with weekday cues — "Sat, Aug 9, 2026", "Sat–Sun, Aug 9–10, 2026".
 * Parents scan results by weekend; the weekday does the work the date can't.
 */
export function formatDateRangeWithWeekday(start: string, end: string | null): string {
  if (!end || end === start) return `${weekdayShort(start)}, ${formatDate(start)}`;
  const [ys, ms] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const ws = weekdayShort(start);
  const we = weekdayShort(end);
  if (ys === ye && ms === me) {
    const days = ws === we ? ws : `${ws}–${we}`;
    return `${days}, ${formatDate(start).replace(`, ${ys}`, "")}–${de}, ${ys}`;
  }
  return `${ws}, ${formatDate(start)} – ${we}, ${formatDate(end)}`;
}

/** Month + day pair for the card date chip. The start day anchors the range. */
export function dateChipParts(start: string): { month: string; day: string } {
  const month = parseIsoDay(start)
    .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return { month, day: String(Number(start.split("-")[2])) };
}
