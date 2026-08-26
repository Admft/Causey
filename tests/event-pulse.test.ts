import { describe, expect, it } from "vitest";
import { buildEventPulse } from "@/lib/event-pulse";

describe("buildEventPulse", () => {
  it("counts RSVP buckets and unfinished organizer registration", () => {
    const pulse = buildEventPulse(
      [
        { profile_id: "a", status: "invited" },
        { profile_id: "b", status: "going", registration_status: null },
        { profile_id: "c", status: "going", registration_status: "registered" },
        { profile_id: "d", status: "not_going" },
      ],
      { hasRegUrl: true }
    );

    expect(pulse).toEqual({
      invited: 4,
      awaiting: 1,
      going: 2,
      notGoing: 1,
      unfinishedRegistration: 1,
      attended: 0,
      resultsBlank: 0,
    });
  });

  it("counts attended rows still missing a recorded result", () => {
    const pulse = buildEventPulse(
      [
        {
          profile_id: "a",
          status: "attended",
          placement: null,
          award_label: null,
          section_id: null,
        },
        {
          profile_id: "b",
          status: "attended",
          placement: 1,
          award_label: null,
          section_id: null,
        },
      ],
      { hasRegUrl: false }
    );

    expect(pulse.attended).toBe(2);
    expect(pulse.resultsBlank).toBe(1);
    expect(pulse.going).toBe(2);
    expect(pulse.unfinishedRegistration).toBe(0);
  });
});
