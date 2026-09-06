import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { organizerCoverUrl } from "../mobile/src/cover-url";
import { applyEntrantDecision } from "../mobile/src/entrant-decision";
import { resolveRegistrationStatus, resolveRsvpStatus } from "../mobile/src/event-registration-state";
import { sectionConstraint } from "../mobile/src/section-constraint";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("phone tournament details", () => {
  const event = read("mobile/app/event/[slug].tsx");
  const calendar = read("mobile/src/calendar.ts");
  const going = read("mobile/src/EventGoingCard.tsx");

  it("shows the organizer photo, US Chess rating, and sections", () => {
    expect(event).toContain("EventCover");
    expect(event).toContain("event.image_url");
    expect(event).toContain("Rating · {ratingLabel}");
    expect(event).toContain("US Chess rated");
    expect(event).toContain("Not rated");
    expect(event).toContain("EventSections");
    expect(event).toContain("event.sections");
    expect(event).toContain("Difficulty {rating.avg_score}");
    const difficulty = read("mobile/src/EventDifficultyRating.tsx");
    expect(difficulty).toContain("[1, 2, 3, 4, 5]");
    expect(difficulty).toContain("[6, 7, 8, 9, 10]");
    expect(difficulty).not.toContain("flexWrap");
    expect(difficulty).not.toContain("Array.from({ length: 10 }");
    expect(organizerCoverUrl("https://organizer.example/flyer.jpg")).toBe(
      "https://organizer.example/flyer.jpg"
    );
    expect(
      organizerCoverUrl("https://directory.fide.com/img/fide_og_1200.png")
    ).toBeNull();
  });

  it("asks who is going and whether organizer registration is finished", () => {
    expect(event).toContain("EventGoingCard");
    expect(going).toContain("Are you going?");
    expect(going).toContain("Did you finish organizer registration?");
    expect(going).toContain("Yes, registration is complete");
    expect(going).toContain("Still need to register");
    expect(going).toContain("Open organizer registration");
    expect(going).toContain("/api/mobile/event-attendance?competitionId=");
    expect(going).toContain("/api/mobile/rsvp");
    expect(going).toContain('status: "opened"');
    expect(going).toContain("safeRegUrl");
    expect(going).toContain("AppState.addEventListener");
    expect(going).toContain("Going on Causey is for Family and Plan");
    expect(going).toContain("resolveRegistrationStatus");
    expect(going).toContain("setLocalStatus");
    expect(going).toContain("Checking who can mark going");
    expect(going).not.toContain("attendance === null && session");
  });

  it("falls back when Expo Go has no native calendar", () => {
    expect(calendar).toContain("isExpoGoRuntime");
    expect(calendar).toContain('appOwnership === "expo"');
    expect(calendar).toContain("eventWebcalUrl");
    expect(calendar).toContain("googleCalendarTemplateUrl");
    expect(calendar).toContain("requestCalendarPermissions");
    expect(event).toContain("slug: event.slug");
    const appJson = JSON.parse(read("mobile/app.json")) as {
      expo: { plugins: unknown[] };
    };
    const calendarPlugin = appJson.expo.plugins.find(
      (plugin) =>
        Array.isArray(plugin) && plugin[0] === "expo-calendar"
    ) as [string, { writeOnlyAccess?: boolean }];
    expect(calendarPlugin[1]?.writeOnlyAccess).toBe(true);
  });
});

describe("GET /api/mobile/event-attendance", () => {
  const route = read("app/api/mobile/event-attendance/route.ts");
  const loader = read("lib/data/mobile-event-attendance.ts");

  it("requires a signed-in allowed account and a competition uuid", () => {
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain('z.string().uuid()');
    expect(route).toContain('searchParams.get("competitionId")');
  });

  it("reuses website RSVP and registration targeting", () => {
    expect(loader).toContain("buildEventRsvpTargets");
    expect(loader).toContain("organizerRegistrationProfileIds");
    expect(loader).toContain("allowsFamilyDiscoveryRsvp");
    expect(loader).toContain("getActiveChildren");
    expect(loader).toContain("getEntrantsForCompetition");
    expect(loader).toContain("getRatingSummary");
  });
});

describe("section constraints on the phone", () => {
  it("names rating bands the same way website badges do", () => {
    expect(
      sectionConstraint({
        id: "s1",
        name: "U1000",
        min_rating: null,
        max_rating: 999,
        min_grade: null,
        max_grade: null,
        min_age: null,
        max_age: null,
        gender_restriction: null,
        residency_state: null,
        entry_fee_cents: null,
      })
    ).toBe("Under 1000");
    expect(
      sectionConstraint({
        id: "s2",
        name: "Open",
        min_rating: null,
        max_rating: null,
        min_grade: null,
        max_grade: null,
        min_age: null,
        max_age: null,
        gender_restriction: null,
        residency_state: null,
        entry_fee_cents: null,
      })
    ).toBe("Open to all");
  });
});

describe("registration confirm status", () => {
  it("lets a local Yes win over a missing or stale server row", () => {
    expect(
      resolveRegistrationStatus({
        serverStatus: "opened",
        localStatus: "registered",
        openedLocally: true,
      })
    ).toBe("registered");
    expect(
      resolveRegistrationStatus({
        serverStatus: null,
        localStatus: "registered",
        openedLocally: true,
      })
    ).toBe("registered");
    expect(
      resolveRegistrationStatus({
        serverStatus: null,
        openedLocally: true,
      })
    ).toBe("opened");
  });

  it("lets a local Going win over a missing attendance reload", () => {
    expect(
      resolveRsvpStatus({
        serverStatus: "unanswered",
        localStatus: "going",
      })
    ).toBe("going");
    expect(
      resolveRsvpStatus({
        serverStatus: "invited",
        localStatus: "not_going",
      })
    ).toBe("not_going");
  });
});

describe("plan and family taps", () => {
  it("hides Going after a local tap even before the list reloads", () => {
    const row = {
      competition_id: "c1",
      profile_id: "p1",
      status: "invited",
      needs_organizer_registration: false,
      competition: {
        slug: "spring-open",
        name: "Spring Open",
        city: null,
        state: null,
        start_date: "2026-10-01",
        end_date: null,
        reg_url: "https://organizer.example/enter",
      },
    };
    expect(applyEntrantDecision(row, "going")).toMatchObject({
      status: "going",
      needs_organizer_registration: true,
    });
    expect(applyEntrantDecision(row, "not_going")).toMatchObject({
      status: "not_going",
      needs_organizer_registration: false,
    });
    expect(
      applyEntrantDecision(
        { ...row, status: "going", needs_organizer_registration: true },
        "registered"
      ).needs_organizer_registration
    ).toBe(false);
  });
});
