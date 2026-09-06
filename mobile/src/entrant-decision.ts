import type { EntrantRowData } from "./EntrantRow";

export type EntrantTap = "going" | "not_going" | "registered" | "clear";

export function applyEntrantDecision(
  row: EntrantRowData,
  decision: EntrantTap
): EntrantRowData {
  if (decision === "registered") {
    return {
      ...row,
      needs_organizer_registration: false,
      registration_status: "registered",
    };
  }
  if (decision === "clear") {
    return {
      ...row,
      status: "invited",
      needs_organizer_registration: false,
    };
  }
  return {
    ...row,
    status: decision,
    needs_organizer_registration:
      decision === "going" && Boolean(row.competition?.reg_url),
  };
}

function isSameEntrant(row: EntrantRowData, target: EntrantRowData): boolean {
  return (
    row.competition_id === target.competition_id &&
    row.profile_id === target.profile_id
  );
}

/**
 * Apply one tap to a list. Clearing drops the row (unanswered is absence).
 * Answering a row that only exists as a parent invite adds it, so the caller
 * must pass a list that belongs to `target.profile_id` — inserting into
 * another student's list would show their sibling's tournament twice.
 */
export function mapEntrantDecision(
  rows: EntrantRowData[],
  target: EntrantRowData,
  decision: EntrantTap
): EntrantRowData[] {
  if (decision === "clear") {
    return rows.filter((row) => !isSameEntrant(row, target));
  }
  const next = rows.map((row) =>
    isSameEntrant(row, target) ? applyEntrantDecision(row, decision) : row
  );
  const known = rows.some((row) => isSameEntrant(row, target));
  if (known || decision === "registered") return next;
  return [
    applyEntrantDecision(
      { ...target, status: "invited", needs_organizer_registration: false },
      decision
    ),
    ...next,
  ];
}

export function actionEntrants(rows: EntrantRowData[]): EntrantRowData[] {
  return rows.filter(
    (row) =>
      row.status === "invited" ||
      row.status === "pending_invite" ||
      row.needs_organizer_registration
  );
}

/** Upcoming rows that do not still need an RSVP or organizer-registration mark. */
export function settledEntrants(rows: EntrantRowData[]): EntrantRowData[] {
  return rows.filter(
    (row) =>
      row.status !== "invited" &&
      row.status !== "pending_invite" &&
      !row.needs_organizer_registration
  );
}
