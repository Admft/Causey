import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  districtActivityActionLabel,
  districtActivityDetail,
  districtActivityFollowThrough,
  districtHostCompetitionsHref,
  districtReportSchoolHref,
} from "@/lib/district-activity";
import type { DistrictAdminActivityRow } from "@/lib/data/district";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function sampleRow(
  overrides: Partial<DistrictAdminActivityRow> = {}
): DistrictAdminActivityRow {
  return {
    id: 1,
    occurred_at: "2026-08-19T12:00:00.000Z",
    action: "organization.settings_changed",
    scope_org_id: "school-1",
    scope_org_name: "Example School",
    scope_org_type: "school",
    actor_display_name: "Alex Admin",
    summary: {},
    ...overrides,
  };
}

describe("district admin activity feed", () => {
  const migration = source(
    "supabase/migrations/0060_district_admin_activity.sql"
  );
  const districtData = source("lib/data/district.ts");
  const activityPage = source("app/orgs/[slug]/activity/page.tsx");
  const reportsPage = source("app/orgs/[slug]/reports/page.tsx");
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

  it("wires scoped district and school Activity tabs with fail-closed reads", () => {
    expect(orgSubnav).toContain('{ id: "activity", label: "Activity"');
    expect(orgSubnav).toContain('path: "/activity"');
    expect(activityPage).toContain('view.org.type === "district"');
    expect(activityPage).toContain(
      "!view.isAdmin || (isDistrict && !view.isDistrictAdmin)"
    );
    expect(activityPage).toContain("getDistrictAdminActivity(view.org.id)");
    expect(activityPage).toContain("getOrgAdminActivity(view.org.id)");
    expect(activityPage).toContain("Activity could not load");
    expect(activityPage).toContain(
      'label: `Retry ${isDistrict ? "district" : "school"} activity`'
    );
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

    const row = sampleRow({
      summary: {
        verification_from: "pending",
        verification_to: "rejected",
        owner_changed: true,
      },
    });
    expect(districtActivityDetail(row)).toContain(
      "Verification: pending → rejected"
    );
    expect(districtActivityDetail(row)).toContain("Ownership changed");
  });

  it("maps activity rows to one next-action deep link", () => {
    const slugByOrgId = new Map([
      ["district-1", "sample-district"],
      ["school-1", "lincoln-hs"],
    ]);
    const ctx = {
      districtSlug: "sample-district",
      districtOrgId: "district-1",
      slugByOrgId,
    };

    expect(
      districtActivityFollowThrough(
        sampleRow({ action: "organization.invitation_created" }),
        ctx
      )
    ).toEqual({
      href: "/orgs/lincoln-hs/people",
      label: "Open People",
    });

    expect(
      districtActivityFollowThrough(
        sampleRow({
          action: "organization.settings_changed",
          summary: { owner_changed: true },
        }),
        ctx
      )
    ).toEqual({
      href: "/orgs/lincoln-hs/settings#ownership",
      label: "Open ownership settings",
    });

    expect(
      districtActivityFollowThrough(
        sampleRow({
          action: "organization.settings_changed",
          summary: {
            verification_from: "pending",
            verification_to: "verified",
          },
        }),
        ctx
      )
    ).toEqual({
      href: "/orgs/lincoln-hs/settings#verification",
      label: "Open verification settings",
    });

    expect(
      districtActivityFollowThrough(
        sampleRow({
          action: "competition.status_changed",
          summary: { name: "Spring Open", from: "draft", to: "published" },
        }),
        ctx
      )
    ).toEqual({
      href: "/orgs/sample-district/competitions?host=school-1",
      label: "Review competitions",
    });

    expect(
      districtActivityFollowThrough(
        sampleRow({
          action: "organization.created",
          scope_org_id: "district-1",
          scope_org_type: "district",
          scope_org_name: "Sample District",
        }),
        ctx
      )
    ).toEqual({
      href: "/orgs/sample-district",
      label: "Open district overview",
    });

    expect(
      districtActivityFollowThrough(
        sampleRow({ scope_org_id: "unknown-school" }),
        ctx
      )
    ).toBeNull();

    expect(activityPage).toContain("districtActivityFollowThrough");
    expect(activityPage).toContain("getChildSchoolsForDistrict");
  });

  it("links reports school rows into school workspaces and host-filtered competitions", () => {
    const slugByOrgId = new Map([["school-1", "lincoln-hs"]]);
    expect(districtReportSchoolHref("school-1", slugByOrgId)).toBe(
      "/orgs/lincoln-hs"
    );
    expect(districtReportSchoolHref("missing", slugByOrgId)).toBeNull();
    expect(districtHostCompetitionsHref("sample-district", "school-1")).toBe(
      "/orgs/sample-district/competitions?host=school-1"
    );

    expect(reportsPage).toContain("districtReportSchoolHref");
    expect(reportsPage).toContain("districtHostCompetitionsHref");
    expect(reportsPage).toContain("getChildSchoolsForDistrict");
    expect(reportsPage).toContain("review RSVPs for");
    expect(reportsPage).toContain("open district competitions");
  });
});
