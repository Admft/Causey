import { describe, expect, it } from "vitest";
import {
  eventIcsUrl,
  eventWebcalUrl,
  googleCalendarTemplateUrl,
} from "@/lib/calendar-links";

describe("calendar fallback URLs", () => {
  it("builds an exclusive all-day Google Calendar template", () => {
    expect(
      googleCalendarTemplateUrl({
        title: "Spring Open",
        startDate: "2026-04-11",
        endDate: null,
        location: "Austin, TX",
        details: "https://causey.dev/event/spring-open",
      })
    ).toBe(
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Spring+Open&location=Austin%2C+TX&details=https%3A%2F%2Fcausey.dev%2Fevent%2Fspring-open&dates=20260411/20260412"
    );
  });

  it("uses the day after end_date as the exclusive end", () => {
    const url = googleCalendarTemplateUrl({
      title: "Weekend Swiss",
      startDate: "2026-04-11",
      endDate: "2026-04-12",
      location: null,
      details: null,
    });
    expect(url).toContain("dates=20260411/20260413");
    expect(url).not.toContain("location=");
  });

  it("turns the event ICS into a webcal URL for Calendar.app", () => {
    expect(eventIcsUrl("https://causey.dev", "spring-open")).toBe(
      "https://causey.dev/event/spring-open/ics"
    );
    expect(eventWebcalUrl("https://causey.dev/", "spring-open")).toBe(
      "webcal://causey.dev/event/spring-open/ics"
    );
    expect(eventWebcalUrl("http://10.0.0.12:3000", "spring-open")).toBe(
      "webcal://10.0.0.12:3000/event/spring-open/ics"
    );
  });
});
