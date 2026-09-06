import type { EntrantRowData } from "./EntrantRow";

export type EntrantTap = "going" | "not_going" | "registered";

export function applyEntrantDecision(
  row: EntrantRowData,
  decision: EntrantTap
): EntrantRowData {
  if (decision === "registered") {
    return { ...row, needs_organizer_registration: false };
  }
  return {
    ...row,
    status: decision,
    needs_organizer_registration:
      decision === "going" && Boolean(row.competition?.reg_url),
  };
}

export function mapEntrantDecision(
  rows: EntrantRowData[],
  target: Pick<EntrantRowData, "competition_id" | "profile_id">,
  decision: EntrantTap
): EntrantRowData[] {
  return rows.map((row) =>
    row.competition_id === target.competition_id &&
    row.profile_id === target.profile_id
      ? applyEntrantDecision(row, decision)
      : row
  );
}

export function actionEntrants(rows: EntrantRowData[]): EntrantRowData[] {
  return rows.filter(
    (row) => row.status === "invited" || row.needs_organizer_registration
  );
}
