import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("district-hosted multi-school invite", () => {
  it("loads connected school rosters instead of the empty district student list", () => {
    const manage = source("app/event/[slug]/manage/page.tsx");
    const action = source("lib/actions/entrants.ts");
    const portal = source("lib/data/portal.ts");
    const form = source("components/EntrantManager.tsx");

    expect(portal).toContain("export async function getChildSchoolsForDistrict");
    expect(manage).toContain("getChildSchoolsForDistrict");
    expect(manage).toContain("Invite connected schools");
    expect(manage).toContain("isDistrictHost");
    expect(action).toContain("export async function inviteConnectedSchoolRosters");
    expect(action).toContain('"invite_connected_school_rosters"');
    expect(action).toContain("p_competition_id: competitionId");
    expect(action).not.toContain("list_connected_school_student_ids");
    expect(action).not.toContain("getOrgRoster");
    expect(form).toContain("inviteConnectedSchoolRosters");
    expect(form).toContain("Invite every connected school");
  });

  it("fans out aggregate invitations without requiring per-student district authority", () => {
    const migration = source(
      "supabase/migrations/0098_role_console_reads_and_district_invites.sql"
    );
    const start = migration.indexOf(
      "create or replace function public.invite_connected_school_rosters"
    );
    const end = migration.indexOf(
      "revoke all on function public.invite_connected_school_rosters",
      start
    );
    const bulkInvite = migration.slice(start, end);
    expect(bulkInvite).toContain("insert into public.notifications");
    expect(bulkInvite).toContain("coalesce(preference.invitation, true)");
    expect(bulkInvite).toContain(":parent:");
    expect(bulkInvite).not.toContain(
      "perform public.create_in_app_notification"
    );
  });

  it("labels district-hosted replies by connected school for follow-up", () => {
    const manage = source("app/event/[slug]/manage/page.tsx");
    const rsvp = source("lib/rsvp.ts");

    expect(manage).toContain("schoolNameByProfileId");
    expect(manage).toContain("labeledAttendance");
    expect(manage).toContain("sortAttendanceBySchool");
    expect(manage).toContain("formatManageReplyMeta");
    expect(manage).toContain(
      "Each reply names the connected school so multi-school follow-up stays"
    );
    expect(manage).toContain(
      "Mark going for a student when the family has not answered"
    );
    expect(manage).toContain(
      "Replies name each school"
    );
    expect(rsvp).toContain("export function sortAttendanceBySchool");
    expect(rsvp).toContain("export function formatManageReplyMeta");
    // Single-host manage still omits school labels unless isDistrictHost.
    expect(manage).toContain("schoolNameByProfileId.get(row.profile_id)");
    expect(manage).toContain("isDistrictHost");
    expect(manage).toContain("origin_org_name");
    expect(manage).toMatch(
      /orgName:\s*isDistrictHost[\s\S]*\? row\.origin_org_name\?\.trim\(\)[\s\S]*: null/
    );
  });

  it("keeps family follow-through copy org-agnostic", () => {
    expect(source("app/family/page.tsx")).not.toContain("Club RSVPs");
    expect(source("app/family/page.tsx")).toContain(
      "RSVPs and unfinished organizer registration"
    );
    expect(source("app/me/page.tsx")).not.toContain("Club RSVPs");
    expect(source("app/orgs/page.tsx")).not.toContain("Club RSVPs");
  });
});
