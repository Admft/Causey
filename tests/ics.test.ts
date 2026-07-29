import { describe, expect, it } from "vitest";
import { buildEventIcs } from "@/lib/ics";

const base = {
  slug: "spring-open-2026-04-11",
  name: "Spring Open",
  start_date: "2026-04-11",
  end_date: null,
  venue_name: "School Cafeteria",
  address: "12 Main St",
  city: "Newark",
  state: "NJ",
  zip: "07102",
};
const now = new Date(Date.UTC(2026, 6, 28, 12, 0, 0));

describe("buildEventIcs", () => {
  it("builds an all-day event with exclusive DTEND (next day)", () => {
    const ics = buildEventIcs(base, now);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260411");
    expect(ics).toContain("DTEND;VALUE=DATE:20260412");
    expect(ics).toContain("SUMMARY:Spring Open");
    expect(ics).toContain("UID:spring-open-2026-04-11@causey.dev");
  });

  it("multi-day events end the day after end_date", () => {
    const ics = buildEventIcs({ ...base, end_date: "2026-04-12" }, now);
    expect(ics).toContain("DTEND;VALUE=DATE:20260413");
  });

  it("rolls DTEND over month boundaries", () => {
    const ics = buildEventIcs(
      { ...base, start_date: "2026-04-30", end_date: null },
      now
    );
    expect(ics).toContain("DTEND;VALUE=DATE:20260501");
  });

  it("escapes commas and folds location parts", () => {
    const ics = buildEventIcs({ ...base, name: "Open, Rated; Fun" }, now);
    expect(ics).toContain("SUMMARY:Open\\, Rated\\; Fun");
    expect(ics).toContain(
      "LOCATION:School Cafeteria\\, 12 Main St\\, Newark\\, NJ 07102"
    );
  });

  it("uses CRLF line endings", () => {
    expect(buildEventIcs(base, now)).toContain("\r\n");
  });
});
