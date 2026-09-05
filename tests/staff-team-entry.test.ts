import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migrationsDirectory = resolve(process.cwd(), "supabase/migrations");
const migrations = readdirSync(migrationsDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort((left, right) => {
    const versionDifference =
      Number(left.slice(0, 4)) - Number(right.slice(0, 4));
    return versionDifference || left.localeCompare(right);
  })
  .map((file) => ({
    file,
    sql: readFileSync(resolve(migrationsDirectory, file), "utf8"),
  }));

function effectiveFunction(name: string) {
  const marker = `create or replace function public.${name}(`;
  const createMarker = `create function public.${name}(`;
  for (let index = migrations.length - 1; index >= 0; index -= 1) {
    const migration = migrations[index];
    let start = migration.sql.lastIndexOf(marker);
    if (start < 0) start = migration.sql.lastIndexOf(createMarker);
    if (start < 0) continue;
    const end = migration.sql.indexOf("$$;", start);
    if (end < 0) throw new Error(`Unterminated ${name} in ${migration.file}`);
    return {
      file: migration.file,
      sql: migration.sql.slice(start, end + 3),
    };
  }
  throw new Error(`Function ${name} was not found`);
}

describe("staff team-entry for going / not going", () => {
  it("adds audited response_source and lets managers set going", () => {
    const migration = source("supabase/migrations/0076_staff_team_entry.sql");
    const guard = effectiveFunction("guard_competition_entrant_update");
    expect(migration).toContain("response_source text");
    expect(migration).toContain("'self', 'parent', 'staff'");
    expect(guard.file).toBe("0076_staff_team_entry.sql");
    expect(guard.sql).toContain("response_source is distinct from 'staff'");
    expect(guard.sql).toContain("when actor = old.profile_id then 'self'");
    expect(guard.sql).toContain("elsif manager then");
    expect(guard.sql).toContain("origin_org_id is distinct from old.origin_org_id");
  });

  it("removes the authenticated guard before the owner-run backfill", () => {
    const migration = source("supabase/migrations/0076_staff_team_entry.sql");
    const dropGuard = migration.indexOf(
      "drop trigger if exists competition_entrants_guard_update"
    );
    const backfill = migration.indexOf("update public.competition_entrants");
    const recreateGuard = migration.indexOf(
      "create trigger competition_entrants_guard_update"
    );

    expect(dropGuard).toBeGreaterThan(-1);
    expect(dropGuard).toBeLessThan(backfill);
    expect(recreateGuard).toBeGreaterThan(backfill);
  });

  it("notifies the student and linked parents after staff entry", () => {
    const notification = effectiveFunction("create_in_app_notification");
    const action = source("lib/actions/entrants.ts");
    expect(notification.file).toBe("0076_staff_team_entry.sql");
    expect(notification.sql).toContain("response_source = 'staff'");
    expect(notification.sql).toContain("staff-rsvp:");
    expect(notification.sql).toContain("p_href = '/family'");
    expect(action).toContain("export async function markEntrantStaffRsvp");
    expect(action).toContain('response_source: "staff"');
    expect(action).toContain("getActiveGuardiansForProfiles");
    expect(action).toContain(
      "Only coaches and administrators can mark a student going."
    );
  });

  it("surfaces Mark going on manage replies and labels staff entry", () => {
    const manage = source("app/event/[slug]/manage/page.tsx");
    const form = source("components/EntrantManager.tsx");
    const family = source("app/family/page.tsx");
    const rsvpWrite = source("lib/rsvp-write.ts");

    expect(form).toContain("export function StaffRsvpButtons");
    expect(form).toContain("markEntrantStaffRsvp");
    expect(form).toContain("Mark going");
    expect(manage).toContain("StaffRsvpButtons");
    expect(manage).toContain("responseSource: row.response_source");
    expect(manage).toContain(
      "Mark going for a student when the family has not answered"
    );
    expect(family).toContain("Marked by staff");
    expect(rsvpWrite).toContain('profileId === input.userId ? "self" : "parent"');
  });

  it("returns response_source on event attendance for manage labels", () => {
    const attendance = effectiveFunction("get_event_attendance");
    expect(attendance.file).toBe("0076_staff_team_entry.sql");
    expect(attendance.sql).toContain("entrant.response_source");
    expect(source("lib/auth/orgs.ts")).toContain(
      'response_source: "self" | "parent" | "staff" | null'
    );
  });
});
