/**
 * RSVP state machine for competition_entrants. Kid-simple by design: two
 * buttons, and once you've answered you can change your answer but never
 * return to "no response".
 */

export const RSVP_STATUSES = ["invited", "going", "not_going"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
export type AttendanceOutcome = "attended" | "did_not_attend";

/** The only forbidden target is un-answering back to invited. */
export function canTransition(from: RsvpStatus, to: RsvpStatus): boolean {
  return to !== "invited";
}

export function rsvpLabel(status: RsvpStatus | AttendanceOutcome): string {
  switch (status) {
    case "attended":
      return "Attended";
    case "did_not_attend":
      return "Did not attend";
    case "going":
      return "Going";
    case "not_going":
      return "Not going";
    default:
      return "No response yet";
  }
}

export function summarizeAttendance(
  rows: { status: RsvpStatus | AttendanceOutcome }[]
): {
  going: number;
  notGoing: number;
  awaiting: number;
  total: number;
} {
  let going = 0;
  let notGoing = 0;
  let awaiting = 0;
  for (const row of rows) {
    if (row.status === "going" || row.status === "attended") going += 1;
    else if (row.status === "not_going" || row.status === "did_not_attend") {
      notGoing += 1;
    }
    else awaiting += 1;
  }
  return { going, notGoing, awaiting, total: rows.length };
}
