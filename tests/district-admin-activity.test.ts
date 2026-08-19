import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  districtActivityActionLabel,
  districtActivityDetail,
} from "@/lib/district-activity";
import type { DistrictAdminActivityRow } from "@/lib/data/district";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district admin activity feed", () => {
  const migration = source(
    "supabase/migrations/0060_district_admin_activity.sql"
  );
  const districtData = source("lib/data/district.ts");
  const activityPage = source("app/orgs/[slug]/activity/page.tsx");
  const orgSubnav = source("components/OrgSubnav.tsx");
  const lockdown = source("supabase/migrations/0016_escalation_lockdown.sql");

  it("authorizes only district admins for the exact district id", () => {
    expect(migration).toContain(
      "public.is_district_admin(p_district_id, auth.uid())"
    );
    expect(migration).toContain("district.type = 'district'");
    expect(migration).toContain(
      "school.parent_org_id = p_district_id"
    );
    expect(migration).toContain("raise exception 'not_authorized'");
  });

  it("does not grant table SELECT on audit_events to authenticated users", () => {
    expect(lockdown).toContain(
      "revoke all on public.audit_events from anon, authenticated"
    );
    expect(migration).not.toMatch(
      /grant\s+select\s+on\s+public\.audit_events/i
    );
    expect(migration).toContain(
      "revoke all on function public.get_district_admin_activity(uuid, integer)"
    );
    expect(migration).toContain(
      "grant execute on function public.get_district_admin_activity(uuid, integer)"
    );
  });

  it("keeps the feed allowlisted and free of invitation emails", () => {
    expect(migration).toContain("'organization.invitation_created'");
    expect(migration).toContain("'organization.settings_changed'");
    expect(migration).toContain("'competition.status_changed'");
    expect(migration).not.toContain("profile.role_changed");
    expect(migration).not.toMatch(/detail->>'email'/);
    expect(migration).not.toMatch(/\bi\.email\b/);
    expect(migration).toContain("actor.display_name");
    expect(migration).toContain("'role', event.detail->>'role'");
  });

  it("wires a district-only Activity tab and fail-closed page", () => {
    expect(orgSubnav).toContain('{ id: "activity", label: "Activity"');
    expect(orgSubnav).toContain('path: "/activity"');
    expect(activityPage).toContain('view.org.type !== "district"');
    expect(activityPage).toContain("!view.isDistrictAdmin");
    expect(activityPage).toContain("getDistrictAdminActivity(view.org.id)");
    expect(activityPage).toContain("Activity could not load");
    expect(activityPage).toContain("Retry district activity");
    expect(activityPage).toContain("Open schools setup");
    expect(districtData).toContain('rpc("get_district_admin_activity"');
    expect(districtData).toContain("p_district_id: districtId");
  });

  it("renders plain-language activity details without inventing facts", () => {
    expect(districtActivityActionLabel("organization.invitation_created")).toBe(
      "Staff invitation sent"
    );
    expect(districtActivityActionLabel("unknown.action")).toBe(
      "Administrative update"
    );

    const row: DistrictAdminActivityRow = {
      id: 1,
      occurred_at: "2026-08-19T12:00:00.000Z",
      action: "organization.settings_changed",
      scope_org_id: "school-1",
      scope_org_name: "Example School",
      scope_org_type: "school",
      actor_display_name: "Alex Admin",
      summary: {
        verification_from: "pending",
        verification_to: "rejected",
        owner_changed: true,
      },
    };
    expect(districtActivityDetail(row)).toContain(
      "Verification: pending → rejected"
    );
    expect(districtActivityDetail(row)).toContain("Ownership changed");
  });
});
