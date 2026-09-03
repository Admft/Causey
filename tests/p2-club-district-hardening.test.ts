import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isCompetitionStarted } from "@/lib/competition-timing";
import { invitationRoleFitsOrganization } from "@/lib/invitations/claim-path";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const p2Sql = read("supabase/migrations/0070_p2_origin_reports_invites.sql");
const reports = read("app/orgs/[slug]/reports/page.tsx");
const exportRoute = read("app/orgs/[slug]/reports/export/route.ts");
const competitions = read("app/orgs/[slug]/competitions/page.tsx");
const overview = read("app/orgs/[slug]/page.tsx");
const manage = read("app/event/[slug]/manage/page.tsx");
const layout = read("app/layout.tsx");
const login = read("app/login/page.tsx");
const districts = read("app/districts/page.tsx");
const districtPitch = read("components/HomeDistrictPitch.tsx");
const districtActions = read("lib/actions/district.ts");
const runbook = read("docs/district-pilot-runbook.md");

describe("P2 club and district hardening", () => {
  it("records origin school and invites in one set-based RPC", () => {
    expect(p2Sql).toContain("origin_org_id");
    expect(p2Sql).toContain("get_district_hosted_origin_rollup");
    expect(p2Sql).toContain("create_org_invitations(");
    expect(p2Sql).toContain("invitation_role_fits_organization");
    expect(p2Sql).toContain("returns table (profile_id uuid, school_id uuid)");
    expect(p2Sql).toContain("drop function if exists public.get_district_school_rollup(uuid)");
    expect(districtActions).toContain("create_org_invitations");
    expect(invitationRoleFitsOrganization("club", "school_admin")).toBe(false);
  });

  it("lists past travel on Competitions and opens attendance on the start date", () => {
    expect(competitions).toContain("Travel");
    expect(competitions).toContain("getOrgAttendedEvents");
    expect(competitions).toContain("Search tournaments");
    expect(overview).toContain("Find a tournament for the roster");
    expect(overview).toContain("attendingPast");
    expect(manage).toContain("isCompetitionStarted");
    expect(manage).toContain("attendanceOpen");
    expect(isCompetitionStarted({ start_date: "2026-09-02" }, "2026-09-02")).toBe(
      true
    );
  });

  it("slices district reports by type and fails school attendance closed", () => {
    expect(reports).toContain("Competition type");
    expect(reports).toContain("District-hosted by participating school");
    expect(reports).toContain("Retry season attendance");
    expect(exportRoute).toContain('"Type"');
    expect(exportRoute).toContain('"District-hosted by school"');
    expect(exportRoute).toContain("getDistrictParticipationReport(view.org.id, reportCategory)");
    expect(exportRoute).toContain("Season attendance is temporarily unavailable");
  });

  it("keeps the January district story honest without the early-build banner", () => {
    expect(layout).not.toContain("EarlyBuildBanner");
    expect(login).toContain('surface="signin"');
    expect(districts).toContain("same organization workspace as schools");
    expect(districts).toContain("not a custom portal");
    expect(districtPitch).toContain("not a custom portal");
    expect(districtPitch).toContain("assisted chess pilot");
    expect(read("app/family/loading.tsx")).toContain("membership line");
    expect(read("app/family/loading.tsx")).not.toContain("club line");
  });

  it("documents restore-drill completeness without claiming a logged drill", () => {
    expect(runbook).toContain("0070_p2_origin_reports_invites.sql");
    expect(runbook).toContain("daily backups are retained 7 days");
    expect(runbook).toContain("PITR is off unless");
    expect(runbook).not.toContain("Drill completed");
    expect(runbook).toContain("Completing this checklist in git is not a completed drill");
  });
});
