import { summarizeAttendance } from "@/lib/rsvp";

export type EventPulseRow = {
  profile_id: string;
  status: string;
  registration_status?: "opened" | "registered" | "not_registered" | null;
  placement?: number | null;
  award_label?: string | null;
  section_id?: string | null;
};

export type EventPulse = {
  invited: number;
  awaiting: number;
  going: number;
  notGoing: number;
  unfinishedRegistration: number;
  attended: number;
  resultsBlank: number;
};

export function buildEventPulse(
  rows: EventPulseRow[],
  options: { hasRegUrl: boolean }
): EventPulse {
  const summary = summarizeAttendance(
    rows.map((row) => ({
      status: row.status as
        | "invited"
        | "going"
        | "not_going"
        | "attended"
        | "did_not_attend",
    }))
  );
  let unfinishedRegistration = 0;
  let attended = 0;
  let resultsBlank = 0;
  for (const row of rows) {
    if (
      options.hasRegUrl &&
      row.status === "going" &&
      row.registration_status !== "registered"
    ) {
      unfinishedRegistration += 1;
    }
    if (row.status === "attended") {
      attended += 1;
      if (
        row.placement == null &&
        !row.award_label &&
        !row.section_id
      ) {
        resultsBlank += 1;
      }
    }
  }
  return {
    invited: summary.total,
    awaiting: summary.awaiting,
    going: summary.going,
    notGoing: summary.notGoing,
    unfinishedRegistration,
    attended,
    resultsBlank,
  };
}
