import { describe, expect, it } from "vitest";
import {
  buildAttentionItems,
  buildLinkedChildAttentionItems,
  DEFAULT_NOTIFICATION_PREFS,
  prefersEmailKind,
  prefersInAppKind,
  type AttentionSourceEvent,
} from "@/lib/notifications";
import type { ChildSummary } from "@/lib/data/portal";

const baseEvent: AttentionSourceEvent = {
  competitionId: "c1",
  slug: "spring-open",
  name: "Spring Open",
  startDate: "2026-08-14",
  endDate: null,
  regDeadline: "2026-08-10",
  regUrl: "https://example.com/reg",
  relation: "going",
};

describe("prefersInAppKind", () => {
  it("always allows account alerts", () => {
    expect(
      prefersInAppKind(
        { ...DEFAULT_NOTIFICATION_PREFS, invitation: false },
        "account"
      )
    ).toBe(true);
  });

  it("honors per-kind toggles and defaults when prefs are missing", () => {
    expect(prefersInAppKind(null, "invitation")).toBe(true);
    expect(
      prefersInAppKind(
        { ...DEFAULT_NOTIFICATION_PREFS, schedule_change: false },
        "schedule_change"
      )
    ).toBe(false);
  });
});

describe("prefersEmailKind", () => {
  it("requires the email master switch and the per-kind preference", () => {
    expect(
      prefersEmailKind(
        { ...DEFAULT_NOTIFICATION_PREFS, email_enabled: false },
        "invitation"
      )
    ).toBe(false);
    expect(
      prefersEmailKind(
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          email_enabled: true,
          reminder_1_day: false,
        },
        "reminder_1_day"
      )
    ).toBe(false);
    expect(
      prefersEmailKind(
        { ...DEFAULT_NOTIFICATION_PREFS, email_enabled: true },
        "reminder_7_day"
      )
    ).toBe(true);
  });
});

describe("buildAttentionItems", () => {
  it("surfaces invitations first", () => {
    const items = buildAttentionItems(
      [{ ...baseEvent, relation: "invited", startDate: "2026-09-01" }],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("invitation");
    expect(items[0]?.ctaLabel).toBe("Respond");
  });

  it("adds one-day and seven-day reminders for going/saved", () => {
    const tomorrow = buildAttentionItems(
      [{ ...baseEvent, startDate: "2026-08-08", relation: "going" }],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );
    expect(tomorrow.some((item) => item.kind === "reminder_1_day")).toBe(true);

    const week = buildAttentionItems(
      [{ ...baseEvent, startDate: "2026-08-12", relation: "saved" }],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );
    expect(week.some((item) => item.kind === "reminder_7_day")).toBe(true);
  });

  it("respects reminder and deadline prefs", () => {
    const items = buildAttentionItems(
      [
        {
          ...baseEvent,
          relation: "going",
          startDate: "2026-08-08",
          regDeadline: "2026-08-09",
        },
      ],
      {
        ...DEFAULT_NOTIFICATION_PREFS,
        reminder_1_day: false,
        registration_deadline: false,
      },
      "2026-08-07"
    );
    expect(items).toEqual([]);
  });

  it("skips past events", () => {
    const items = buildAttentionItems(
      [
        {
          ...baseEvent,
          startDate: "2026-07-01",
          endDate: "2026-07-02",
          relation: "invited",
        },
      ],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );
    expect(items).toEqual([]);
  });
});

function childSummary(
  profileId: string,
  displayName: string,
  options?: {
    status?: "invited" | "going";
    registrationStatus?: "opened" | "registered" | "not_registered" | null;
    startDate?: string;
  }
): ChildSummary {
  return {
    profile_id: profileId,
    display_name: displayName,
    orgs: [],
    entrants: [
      {
        competition_id: "c1",
        profile_id: profileId,
        status: options?.status ?? "invited",
        responded_by: null,
        registration_status: options?.registrationStatus ?? null,
        competition: {
          slug: "spring-open",
          name: "Spring Open",
          city: "Dallas",
          state: "TX",
          start_date: options?.startDate ?? "2026-08-14",
          end_date: null,
          reg_url: "https://example.com/reg",
        },
      },
    ],
  };
}

describe("buildLinkedChildAttentionItems", () => {
  it("routes a named child invitation through the family desk", () => {
    const items = buildLinkedChildAttentionItems(
      [childSummary("student-1", "Jordan")],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: "child-invite:student-1:c1",
        title: "Jordan · Respond: Spring Open",
        href: "/family#needs-response",
      }),
    ]);
  });

  it("shows unfinished organizer registration without requiring a deadline", () => {
    const items = buildLinkedChildAttentionItems(
      [
        childSummary("student-1", "Jordan", {
          status: "going",
          registrationStatus: null,
        }),
      ],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: "child-registration:student-1:c1",
        title: "Jordan · Finish organizer registration: Spring Open",
      }),
    ]);
  });

  it("hides completed registration and respects parent preferences", () => {
    const registered = buildLinkedChildAttentionItems(
      [
        childSummary("student-1", "Jordan", {
          status: "going",
          registrationStatus: "registered",
        }),
      ],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );
    const invitationsOff = buildLinkedChildAttentionItems(
      [childSummary("student-1", "Jordan")],
      { ...DEFAULT_NOTIFICATION_PREFS, invitation: false },
      "2026-08-07"
    );

    expect(registered).toEqual([]);
    expect(invitationsOff).toEqual([]);
  });

  it("keeps the same event actionable for two linked students", () => {
    const items = buildLinkedChildAttentionItems(
      [
        childSummary("student-1", "Jordan"),
        childSummary("student-2", "Riley"),
      ],
      DEFAULT_NOTIFICATION_PREFS,
      "2026-08-07"
    );

    expect(items.map((item) => item.id)).toEqual([
      "child-invite:student-1:c1",
      "child-invite:student-2:c1",
    ]);
  });
});
