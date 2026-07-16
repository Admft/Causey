/** Display helpers shared across pages. */

export function formatFeeCents(cents: number): string {
  if (cents === 0) return "No entry fee";
  return (cents / 100) % 1 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}

const GRADE_LABELS: Record<number, string> = { 0: "K" };
export function gradeLabel(grade: number): string {
  return GRADE_LABELS[grade] ?? String(grade);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
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
