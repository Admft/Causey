/**
 * Competition calendar timing — upcoming vs ended, and 1-year retention.
 * End date is end_date when set, otherwise start_date (single-day events).
 */

export type TimingFilter = "upcoming" | "ended" | "all";

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Calendar date in a named timezone. Falls back to UTC if the zone is invalid. */
export function todayIsoInTimeZone(
  timeZone: string,
  now = new Date()
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return todayIsoDate(now);
  }
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

/** True from the first calendar day of the event (day-of attendance). */
export function isCompetitionStarted(
  competition: { start_date: string },
  asOf: string = todayIsoDate()
): boolean {
  return competition.start_date <= asOf;
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
