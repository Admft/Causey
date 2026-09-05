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

export type AttendanceReplyBucket = "awaiting" | "going" | "notGoing";

/** Map entrant status into the three coach-facing reply buckets. */
export function attendanceReplyBucket(
  status: RsvpStatus | AttendanceOutcome
): AttendanceReplyBucket {
  if (status === "going" || status === "attended") return "going";
  if (status === "not_going" || status === "did_not_attend") return "notGoing";
  return "awaiting";
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
    const bucket = attendanceReplyBucket(row.status);
    if (bucket === "going") going += 1;
    else if (bucket === "notGoing") notGoing += 1;
    else awaiting += 1;
  }
  return { going, notGoing, awaiting, total: rows.length };
}

/**
 * Split manage-page replies into school-safe buckets so coaches review
 * awaiting / going / can’t-go instead of one flat admin table.
 */
export function groupAttendanceByReplyStatus<
  T extends { status: RsvpStatus | AttendanceOutcome },
>(rows: T[]): {
  awaiting: T[];
  going: T[];
  notGoing: T[];
} {
  const awaiting: T[] = [];
  const going: T[] = [];
  const notGoing: T[] = [];
  for (const row of rows) {
    const bucket = attendanceReplyBucket(row.status);
    if (bucket === "going") going.push(row);
    else if (bucket === "notGoing") notGoing.push(row);
    else awaiting.push(row);
  }
  return { awaiting, going, notGoing };
}

/** Mission-aware section order for manage replies / attendance. */
export function orderedAttendanceReplySections(options: {
  isPast: boolean;
  needsReplies: boolean;
}): AttendanceReplyBucket[] {
  if (options.isPast) return ["going", "awaiting", "notGoing"];
  if (options.needsReplies) return ["awaiting", "going", "notGoing"];
  return ["going", "awaiting", "notGoing"];
}

/**
 * Keep district-hosted reply lists scannable by school, then name.
 * Rows without a school stay last so connected-school follow-up stays obvious.
 */
export function sortAttendanceBySchool<
  T extends { orgName?: string | null; display_name?: string | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aSchool = a.orgName?.trim() || "";
    const bSchool = b.orgName?.trim() || "";
    if (aSchool && !bSchool) return -1;
    if (!aSchool && bSchool) return 1;
    const schoolCmp = aSchool.localeCompare(bSchool, undefined, {
      sensitivity: "base",
    });
    if (schoolCmp !== 0) return schoolCmp;
    return (a.display_name ?? "").localeCompare(b.display_name ?? "", undefined, {
      sensitivity: "base",
    });
  });
}

export type ManageReplyRegistrationStatus =
  | "opened"
  | "registered"
  | "not_registered"
  | null
  | undefined;

/**
 * Plain-language meta under a manage reply row. District hosts see the school
 * name; organizer-registration follow-up only appears for students marked going
 * when the listing has an external registration URL.
 */
export type ResponseSource = "self" | "parent" | "staff";

export function formatManageReplyMeta(options: {
  status: RsvpStatus | AttendanceOutcome;
  orgName?: string | null;
  memberStatus?: string | null;
  hasRegUrl?: boolean;
  registrationStatus?: ManageReplyRegistrationStatus;
  responseSource?: ResponseSource | string | null;
}): string {
  const parts = [rsvpLabel(options.status)];
  const school = options.orgName?.trim();
  if (school) parts.push(school);
  if (options.responseSource === "staff") {
    parts.push("entered by staff");
  }
  if (options.memberStatus && options.memberStatus !== "active") {
    parts.push("no longer on roster");
  }
  if (
    options.hasRegUrl &&
    (options.status === "going" || options.status === "attended")
  ) {
    parts.push(
      options.registrationStatus === "registered"
        ? "organizer registration marked complete"
        : "organizer registration unfinished"
    );
  }
  return parts.join(" · ");
}
