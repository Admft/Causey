/**
 * Competition calendar timing — upcoming vs ended, and 1-year retention.
 * End date is end_date when set, otherwise start_date (single-day events).
 */

export type TimingFilter = "upcoming" | "ended" | "all";

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function effectiveEndDate(competition: {
  start_date: string;
  end_date: string | null;
}): string {
  return competition.end_date ?? competition.start_date;
}

export function isCompetitionEnded(
  competition: { start_date: string; end_date: string | null },
  asOf: string = todayIsoDate()
): boolean {
  return effectiveEndDate(competition) < asOf;
}

/** True when the event ended more than one calendar year before asOf. */
export function isPastRetention(
  competition: { start_date: string; end_date: string | null },
  asOf: string = todayIsoDate()
): boolean {
  return effectiveEndDate(competition) < retentionCutoffDate(asOf);
}

export function retentionCutoffDate(asOf: string = todayIsoDate()): string {
  const d = new Date(`${asOf}T00:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function matchesTimingFilter(
  competition: { start_date: string; end_date: string | null },
  timing: TimingFilter | undefined,
  asOf: string = todayIsoDate()
): boolean {
  const mode = timing ?? "upcoming";
  if (mode === "all") return true;
  const ended = isCompetitionEnded(competition, asOf);
  return mode === "ended" ? ended : !ended;
}
