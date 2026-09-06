import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { organizerCoverUrl } from "../mobile/src/cover-url";
import { applyEntrantDecision, mapEntrantDecision } from "../mobile/src/entrant-decision";
import { createRequestGate, isAbortError } from "../mobile/src/request-gate";
import {
  deskChangeRow,
  notifyDeskChanged,
  onDeskChanged,
} from "../mobile/src/desk-sync";
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
    expect(going).toContain("Can't go");
    expect(going).toContain("Your coach needs an RSVP");
    expect(going).toContain("An RSVP needs your response");
    expect(going).toContain("A club invite is not required on a public listing");
    expect(going).toContain("Did you finish organizer registration?");
    expect(going).toContain("Yes, registration is complete");
    expect(going).toContain("Still need to register");
    expect(going).toContain("Clear answer");
    expect(going).toContain('status: "clear"');
    expect(going).toContain("notifyDeskChanged");
    expect(going).toContain("loadGate.abort()");
    expect(going).not.toContain("await clearAnswer(person)");
    expect(going).toContain("Invite ${person.label}");
    expect(going).toContain("/api/mobile/recommendations");
    expect(going).toContain("someoneGoing");
    expect(going).toContain("Waiting for {person.label} to answer on Plan");
    expect(going).toContain("Undo complete mark");
    expect(going).toContain("leave(person)");
    expect(going).not.toContain("Registration is still needed");
    expect(going).toContain("Open organizer registration");
    expect(going).toContain("/api/mobile/event-attendance?competitionId=");
    expect(going).toContain("/api/mobile/rsvp");
    expect(going).toContain('status: "opened"');
    expect(going).toContain("safeRegUrl");
    expect(going).toContain("AppState.addEventListener");
    expect(going).toContain("Going on Causey is for Family and Plan");
    expect(going).toContain("status === \"invited\"");
    expect(going).toContain("resolveRegistrationStatus");
    expect(going).toContain("setLocalStatus");
    expect(going).toContain("Checking who can mark going");
    expect(going).not.toContain("attendance === null && session");
  });

  it("lets a coach bring a roster to a public event", () => {
    expect(event).toContain("BringRosterCard");
    const roster = read("mobile/src/BringRosterCard.tsx");
    expect(roster).toContain("Bring your roster");
    expect(roster).toContain(
      "Add this event to a club, team, or school calendar, then invite its"
    );
    expect(roster).toContain("Students and parents answer on Family");
    expect(roster).toContain("Choose a roster");
    expect(roster).toContain("Mark ${TYPE_LABEL[selected.org.type].toLowerCase()} as going");
    expect(roster).toContain("/api/mobile/orgs");
    expect(roster).toContain("isCoach === true && item.has_roster === true");
    expect(roster).toContain("/api/mobile/org-attendance");
    expect(roster).toContain("Open event on the website");
    expect(roster).toContain("Invite roster on the website");
    expect(roster).toContain("/event/${eventSlug}/manage");
    expect(roster).not.toContain("This screen is not on the server");
    expect(roster).not.toContain("District");
    const route = read("app/api/mobile/org-attendance/route.ts");
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain("getCoachOrgsWithAttendance");
    expect(route).toContain("performSetOrgAttendance");
    expect(route).toContain("auth.supabase");
    expect(route).not.toContain("createServerSupabaseClient");
    expect(read("lib/org-attendance-write.ts")).toContain(
      "District offices do not have student rosters"
    );
    expect(read("lib/actions/attendance.ts")).toContain("performSetOrgAttendance");
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
    expect(loader).toContain("getSentRecommendationRecipientIds");
    expect(loader).toContain("sent_recommendation_ids");
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
    expect(
      resolveRsvpStatus({
        serverStatus: "going",
        localStatus: "unanswered",
      })
    ).toBe("unanswered");
  });
});

describe("phone list reloads", () => {
  it("drops an in-flight list when a newer one starts", () => {
    const gate = createRequestGate();
    const first = gate.start();
    const second = gate.start();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
    const aborted = new Error("Aborted");
    aborted.name = "AbortError";
    expect(isAbortError(aborted)).toBe(true);
  });

  it("tells Family when the event screen saves an RSVP", () => {
    const seen: string[] = [];
    const stop = onDeskChanged((change) => {
      if (change) seen.push(deskChangeRow(change).profile_id);
    });
    notifyDeskChanged({
      competition_id: "c1",
      profile_id: "child-1",
      decision: "clear",
      competition: null,
    });
    stop();
    expect(seen).toEqual(["child-1"]);
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
    expect(
      mapEntrantDecision(
        [{ ...row, status: "going", needs_organizer_registration: true }],
        { ...row, status: "going", needs_organizer_registration: true },
        "clear"
      )
    ).toEqual([]);
    expect(
      mapEntrantDecision([], { ...row, status: "pending_invite" }, "going")
    ).toMatchObject([
      { status: "going", needs_organizer_registration: true },
    ]);
  });

  it("keeps one student's tap off their siblings and their keys unique", () => {
    const family = read("mobile/app/(tabs)/family.tsx");
    expect(family).toContain(
      "if (child.profile_id !== row.profile_id) return child;"
    );
    expect(family).toContain("function dedupeEntrants");
    expect(family).toContain("dedupeEntrants([");
    expect(family).toContain(
      "key={`action:${row.profile_id}:${row.competition_id}`}"
    );
    expect(family).toContain(
      "key={`upcoming:${row.profile_id}:${row.competition_id}`}"
    );
    const sibling = {
      competition_id: "c1",
      profile_id: "sibling",
      status: "going" as const,
      needs_organizer_registration: false,
      competition: null,
    };
    // Clearing one child must not touch the sibling row on the same event.
    expect(
      mapEntrantDecision(
        [sibling],
        { ...sibling, profile_id: "mine" },
        "clear"
      )
    ).toEqual([sibling]);
  });
});
