import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { todayIsoInTimeZone } from "@/lib/competition-timing";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("parent competition alerts", () => {
  it("fans invitations, results, and announcements out to linked parents", () => {
    const migration = read(
      "supabase/migrations/0067_household_alerts_and_event_covers.sql"
    );
    const invites = read("lib/actions/entrants.ts");
    const district = read("lib/actions/district.ts");
    const results = read("lib/results-write.ts");

    expect(migration).toContain("get_active_guardians_for_profiles");
    expect(migration).toContain("/family#needs-response");
    expect(migration).toContain("p_kind = 'result'");
    expect(migration).toContain("household.parent_profile_id");
    expect(invites).toContain("getActiveGuardiansForProfiles");
    expect(invites).toContain("/family#needs-response");
    expect(invites).toContain(":parent:");
    expect(district).toContain("announcement:${row.id}:parent:");
    expect(results).toContain('kind: "result"');
    expect(district).toContain("/family");
  });

  it("emails recorded results without duplicating student invitation mail", () => {
    const migration = read(
      "supabase/migrations/0067_household_alerts_and_event_covers.sql"
    );
    const pendingStart = migration.indexOf(
      "create or replace function public.get_pending_notification_emails("
    );
    const pending = migration.slice(pendingStart, pendingStart + 2500);

    expect(pending).toContain("'result'");
    expect(pending).toContain("'account'");
    expect(pending).not.toMatch(/n\.kind in \([^)]*'invitation'/s);
  });

  it("uses the parent timezone on Family and Alerts", () => {
    const family = read("app/family/page.tsx");
    const alerts = read("app/me/notifications/page.tsx");
    const enqueue = read("lib/email/enqueue.ts");

    expect(family).toContain("todayIsoInTimeZone");
    expect(family).toContain("getNotificationPreferences");
    expect(alerts).toContain("todayIsoInTimeZone");
    expect(alerts).toContain("buildLinkedChildAttentionItems");
    expect(alerts).toContain("NotificationInboxItem");
    expect(alerts).toContain("Opening an update marks");
    expect(read("components/NotificationInboxActions.tsx")).toContain(
      "markNotificationRead"
    );
    expect(enqueue).toContain("todayIsoInTimeZone");
  });

  it("formats today in the named timezone instead of UTC", () => {
    const chicago = todayIsoInTimeZone(
      "America/Chicago",
      new Date("2026-08-27T04:30:00.000Z")
    );
    const utc = todayIsoInTimeZone(
      "UTC",
      new Date("2026-08-27T04:30:00.000Z")
    );
    expect(chicago).toBe("2026-08-26");
    expect(utc).toBe("2026-08-27");
  });
});
