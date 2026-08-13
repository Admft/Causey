import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
  for (let index = migrations.length - 1; index >= 0; index -= 1) {
    const migration = migrations[index];
    const start = migration.sql.lastIndexOf(marker);
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

const remediation = readFileSync(
  resolve(
    migrationsDirectory,
    "0044_database_security_remediation.sql"
  ),
  "utf8"
);

describe("effective database security remediation", () => {
  it("demotes only removed join-code memberships on reactivation", () => {
    const definition = effectiveFunction("join_org_with_code");
    expect(definition.file).toBe(
      "0044_database_security_remediation.sql"
    );
    expect(definition.sql).toContain(
      "when membership.status = 'removed' then 'student'"
    );
    expect(definition.sql).toContain("else membership.role");
    expect(definition.sql).toContain("and o.type <> 'district'");
  });

  it("authorizes each notification relationship and rejects external hrefs", () => {
    const definition = effectiveFunction("create_in_app_notification");
    expect(definition.file).toBe(
      "0044_database_security_remediation.sql"
    );
    expect(definition.sql).toContain("left(p_href, 2) = '//'");
    expect(definition.sql).toContain(
      "external_notification_href_not_allowed"
    );
    expect(definition.sql).toContain("p_recipient_id = actor");
    expect(definition.sql).toContain("entrant.invited_by = actor");
    expect(definition.sql).toContain("entrant.responded_by = actor");
    expect(definition.sql).toContain("announcement.created_by = actor");
    expect(definition.sql).toContain("authorized is not true");
    expect(remediation).toContain(
      ") to authenticated;\n\ncomment on function public.create_in_app_notification"
    );
  });

  it("guards owner eligibility and standalone public moderation", () => {
    const ownerGuard = effectiveFunction(
      "guard_organization_owner_transfer"
    );
    const moderation = effectiveFunction(
      "enforce_public_event_moderation"
    );
    expect(ownerGuard.sql).toContain(
      "actor is distinct from old.owner_profile_id"
    );
    expect(ownerGuard.sql).toContain("membership.status = 'active'");
    expect(ownerGuard.sql).toContain("'district_admin'");
    expect(moderation.sql).toContain("new.source = 'organizer'");
    expect(moderation.sql).toContain("new.status := 'pending_review'");
    expect(moderation.sql).not.toContain("new.org_id is not null");
  });

  it("uses district-aware authority for organization operations", () => {
    const invite = effectiveFunction("can_invite_to_competition");
    const attendance = effectiveFunction("get_event_attendance");
    const roster = effectiveFunction("get_org_roster");
    const rotate = effectiveFunction("rotate_join_code");
    const setGroupMembers = effectiveFunction("set_group_members");

    expect(invite.sql).toContain(
      "public.can_operate_org_competitions("
    );
    expect(attendance.sql).toContain(
      "public.can_operate_org_competitions("
    );
    expect(roster.sql).toContain(
      "public.can_administer_org(p_org_id, auth.uid())"
    );
    expect(rotate.sql).toContain(
      "public.can_administer_org(p_org_id, auth.uid())"
    );
    expect(setGroupMembers.sql).toContain(
      "public.can_operate_org_competitions(target_org_id, auth.uid())"
    );
    expect(setGroupMembers.sql).toContain(
      "delete from public.org_group_members"
    );
    expect(setGroupMembers.sql.indexOf("group_member_not_active")).toBeLessThan(
      setGroupMembers.sql.indexOf("delete from public.org_group_members")
    );
    expect(remediation).toContain(
      'create policy "memberships_select_own_or_staff"'
    );
    expect(remediation).not.toContain(
      "or public.is_active_member(org_id, auth.uid())\n    or public.is_org_coach"
    );
  });

  it("separates RSVP integrity from manager attendance updates", () => {
    const guard = effectiveFunction(
      "guard_competition_entrant_update"
    );
    expect(guard.sql).toContain(
      "new.responded_by is distinct from actor"
    );
    expect(guard.sql).toContain(
      "new.attendance_marked_by is distinct from actor"
    );
    expect(guard.sql).toContain(
      "public.can_invite_to_competition("
    );
    expect(remediation).toContain("attendance_marked_by,");
    expect(remediation).toContain("attendance_marked_at");
  });

  it("refreshes grants, cover validation, and stale lease recovery", () => {
    const cover = effectiveFunction(
      "can_manage_tournament_cover_path"
    );
    const sectionReplacement = effectiveFunction(
      "ingestion_replace_competition_sections"
    );
    const outbox = effectiveFunction("claim_email_outbox_batch");

    for (const column of [
      "custom_category_name",
      "participation_mode",
      "audience",
      "submitted_for_review_at",
      "reviewed_at",
      "reviewed_by",
      "moderation_note",
    ]) {
      expect(remediation).toContain(column);
    }

    expect(cover.sql).toContain("p_require_draft");
    expect(cover.sql).toContain(
      "from public.tournament_drafts draft"
    );
    expect(remediation).toContain(
      "tournament_drafts_cover_path_check"
    );
    expect(sectionReplacement.sql).toContain(
      "auth.role() <> 'service_role'"
    );
    expect(sectionReplacement.sql).toContain("delete from public.sections");
    expect(sectionReplacement.sql).toContain("insert into public.sections");
    expect(remediation).toContain(
      "grant execute on function public.ingestion_replace_competition_sections(uuid, jsonb)"
    );
    expect(outbox.sql).toContain("outbox.status = 'sending'");
    expect(outbox.sql).toContain("outbox.locked_at is null");
    expect(outbox.sql).toContain("interval '15 minutes'");
    expect(outbox.sql).toContain("for update skip locked");
    expect(remediation).toContain("to service_role;");
  });

  it("pins every new SECURITY DEFINER function to a search path", () => {
    const definitions =
      remediation.match(
        /create or replace function[\s\S]*?\$\$;/g
      ) ?? [];
    const securityDefiners = definitions.filter((definition) =>
      definition.includes("security definer")
    );
    expect(securityDefiners.length).toBeGreaterThan(0);
    for (const definition of securityDefiners) {
      expect(definition).toContain("set search_path = public");
    }
  });
});
