import { describe, expect, it } from "vitest";
import {
  canTransition,
  rsvpLabel,
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

  it("never allows returning to invited", () => {
    const statuses: RsvpStatus[] = ["invited", "going", "not_going"];
    for (const from of statuses) {
      expect(canTransition(from, "invited")).toBe(false);
    }
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
