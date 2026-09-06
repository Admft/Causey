import { describe, expect, it } from "vitest";
import {
  attendanceReplyBucket,
  canTransition,
  clearRsvpMode,
  formatManageReplyMeta,
  groupAttendanceByReplyStatus,
  orderedAttendanceReplySections,
  rsvpLabel,
  sortAttendanceBySchool,
  summarizeAttendance,
  type RsvpStatus,
} from "@/lib/rsvp";

describe("canTransition", () => {
  it("allows answering an invite either way", () => {
    expect(canTransition("invited", "going")).toBe(true);
    expect(canTransition("invited", "not_going")).toBe(true);
  });

  it("allows changing an answer", () => {
    expect(canTransition("going", "not_going")).toBe(true);
    expect(canTransition("not_going", "going")).toBe(true);
  });

  it("allows clearing an answer back to invited", () => {
    expect(canTransition("going", "invited")).toBe(true);
    expect(canTransition("not_going", "invited")).toBe(true);
    expect(canTransition("invited", "invited")).toBe(false);
  });
});

describe("clearRsvpMode", () => {
  it("deletes family-discovery rows the parent or student created", () => {
    expect(
      clearRsvpMode({
        invited_by: "parent-1",
        profile_id: "child-1",
        callerId: "parent-1",
      })
    ).toBe("delete");
    expect(
      clearRsvpMode({
        invited_by: "child-1",
        profile_id: "child-1",
        callerId: "parent-1",
      })
    ).toBe("delete");
  });

  it("resets a coach invite to unanswered instead of deleting it", () => {
    expect(
      clearRsvpMode({
        invited_by: "coach-1",
        profile_id: "child-1",
        callerId: "parent-1",
      })
    ).toBe("reset");
    expect(
      clearRsvpMode({
        invited_by: null,
        profile_id: "child-1",
        callerId: "parent-1",
      })
    ).toBe("reset");
  });
});

describe("rsvpLabel", () => {
  it("labels every status", () => {
    expect(rsvpLabel("invited")).toBe("No response yet");
    expect(rsvpLabel("going")).toBe("Going");
    expect(rsvpLabel("not_going")).toBe("Not going");
  });
});

describe("summarizeAttendance", () => {
  it("counts each bucket", () => {
    const rows: { status: RsvpStatus }[] = [
      { status: "going" },
      { status: "going" },
      { status: "not_going" },
      { status: "invited" },
    ];
    expect(summarizeAttendance(rows)).toEqual({
      going: 2,
      notGoing: 1,
      awaiting: 1,
      total: 4,
    });
  });

  it("handles an empty list", () => {
    expect(summarizeAttendance([])).toEqual({
      going: 0,
      notGoing: 0,
      awaiting: 0,
      total: 0,
    });
  });
});

describe("groupAttendanceByReplyStatus", () => {
  it("splits manage replies into school-safe buckets", () => {
    const rows = [
      { id: "a", status: "invited" as const },
      { id: "b", status: "going" as const },
      { id: "c", status: "attended" as const },
      { id: "d", status: "not_going" as const },
      { id: "e", status: "did_not_attend" as const },
    ];
    const grouped = groupAttendanceByReplyStatus(rows);
    expect(grouped.awaiting.map((row) => row.id)).toEqual(["a"]);
    expect(grouped.going.map((row) => row.id)).toEqual(["b", "c"]);
    expect(grouped.notGoing.map((row) => row.id)).toEqual(["d", "e"]);
  });

  it("maps attendance outcomes into the same coach-facing buckets", () => {
    expect(attendanceReplyBucket("attended")).toBe("going");
    expect(attendanceReplyBucket("did_not_attend")).toBe("notGoing");
    expect(attendanceReplyBucket("invited")).toBe("awaiting");
  });
});

describe("orderedAttendanceReplySections", () => {
  it("leads with awaiting replies when follow-up is the mission", () => {
    expect(
      orderedAttendanceReplySections({ isPast: false, needsReplies: true })
    ).toEqual(["awaiting", "going", "notGoing"]);
  });

  it("leads with going/attendance after the event", () => {
    expect(
      orderedAttendanceReplySections({ isPast: true, needsReplies: false })
    ).toEqual(["going", "awaiting", "notGoing"]);
  });
});

describe("sortAttendanceBySchool", () => {
  it("orders district-hosted replies by school then name", () => {
    const sorted = sortAttendanceBySchool([
      { display_name: "Zoe", orgName: "West Middle" },
      { display_name: "Ann", orgName: "East Middle" },
      { display_name: "Bo", orgName: null },
      { display_name: "Cal", orgName: "East Middle" },
    ]);
    expect(sorted.map((row) => row.display_name)).toEqual([
      "Ann",
      "Cal",
      "Zoe",
      "Bo",
    ]);
  });
});

describe("formatManageReplyMeta", () => {
  it("names the school on district-hosted replies", () => {
    expect(
      formatManageReplyMeta({
        status: "invited",
        orgName: "East Middle",
      })
    ).toBe("No response yet · East Middle");
  });

  it("adds organizer-registration follow-up only for going students", () => {
    expect(
      formatManageReplyMeta({
        status: "going",
        orgName: "East Middle",
        hasRegUrl: true,
        registrationStatus: null,
      })
    ).toBe("Going · East Middle · organizer registration unfinished");
    expect(
      formatManageReplyMeta({
        status: "going",
        orgName: "East Middle",
        hasRegUrl: true,
        registrationStatus: "registered",
      })
    ).toBe("Going · East Middle · organizer registration marked complete");
    expect(
      formatManageReplyMeta({
        status: "invited",
        orgName: "East Middle",
        hasRegUrl: true,
      })
    ).toBe("No response yet · East Middle");
  });

  it("stays school-free for single-host manage rows", () => {
    expect(
      formatManageReplyMeta({
        status: "going",
        memberStatus: "inactive",
      })
    ).toBe("Going · no longer on roster");
  });

  it("labels staff team-entry on manage replies", () => {
    expect(
      formatManageReplyMeta({
        status: "going",
        orgName: "East Middle",
        responseSource: "staff",
      })
    ).toBe("Going · East Middle · entered by staff");
  });
});
