import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVATION_CODE_ALPHABET,
  ACTIVATION_CODE_LENGTH,
  formatActivationCode,
  isValidActivationCode,
  normalizeActivationCode,
} from "@/lib/invitations/activation-code";

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const migration = readRepoFile(
  "supabase/migrations/0074_district_provisioning_codes.sql"
);
const schoolMigration = readRepoFile(
  "supabase/migrations/0078_admin_provision_district_school.sql"
);
const adminActions = readRepoFile("lib/actions/admin.ts");
const districtActions = readRepoFile("lib/actions/district.ts");
const provisionForm = readRepoFile("components/AdminDistrictProvisionForm.tsx");
const schoolProvisionForm = readRepoFile(
  "components/AdminSchoolProvisionForm.tsx"
);
const invitationCopyRow = readRepoFile(
  "components/AdminInvitationCopyRow.tsx"
);
const adminOrgsPage = readRepoFile("app/admin/organizations/page.tsx");
const explorer = readRepoFile("components/AdminOrganizationsExplorer.tsx");
const peopleManager = readRepoFile(
  "components/OrganizationPeopleManager.tsx"
);
const claimCodePage = readRepoFile("app/claim/page.tsx");

describe("activation code helpers", () => {
  it("mirrors the database alphabet and length", () => {
    expect(ACTIVATION_CODE_LENGTH).toBe(8);
    expect(migration).toContain(`alphabet text := '${ACTIVATION_CODE_ALPHABET}'`);
    expect(migration).toMatch(/for byte_index in 0\.\.7 loop/);
  });

  it("accepts separators and rejects lookalike characters", () => {
    expect(normalizeActivationCode("bcdf-ghjk")).toBe("BCDFGHJK");
    expect(normalizeActivationCode(" bcdf ghjk ")).toBe("BCDFGHJK");
    expect(isValidActivationCode("bcdf-ghjk")).toBe(true);
    expect(isValidActivationCode("BCDFGHI0")).toBe(false);
    expect(isValidActivationCode("BCDFGHJ")).toBe(false);
    expect(isValidActivationCode("BCDFGHJKM")).toBe(false);
    expect(formatActivationCode("BCDFGHJK")).toBe("BCDF-GHJK");
  });
});

describe("0074 district provisioning", () => {
  it("stores only the hash of a code that is shown once", () => {
    expect(migration).toContain("activation_code_hash text");
    expect(migration).toContain(
      "create unique index if not exists org_invitations_activation_code_idx"
    );
    expect(migration).toContain("encode(digest(raw_code, 'sha256'), 'hex')");
    expect(migration).not.toMatch(/insert into org_invitations[\s\S]*?activation_code text/);
  });

  it("restores the extension search path that 0070 dropped", () => {
    const created =
      migration.split("create function public.create_org_invitation")[1] ?? "";
    const header = created.split("as $$")[0] ?? "";
    expect(header).toContain("set search_path = public, extensions");
    expect(header).not.toMatch(/set search_path = public\s*\n/);
    expect(created).toContain("gen_random_bytes(32)");
  });

  it("keeps claiming by code bound to the invited email and a 7-day expiry", () => {
    const claim = migration.split("claim_org_invitation_by_code")[1] ?? "";
    expect(claim).toContain("lower(target.email) <> viewer_email");
    expect(claim).toContain("target.expires_at <= now()");
    expect(claim).toContain("target.status <> 'pending'");
    expect(claim).toContain("raise exception 'invalid_invitation'");
    expect(migration).toContain(
      "grant execute on function public.claim_org_invitation_by_code(text)\n  to authenticated"
    );
  });

  it("slows code enumeration and hides unclaimable invitations", () => {
    const preview =
      migration.split("get_org_invitation_preview_by_code")[1] ?? "";
    expect(preview).toContain("perform pg_sleep(0.15)");
    expect(preview).toContain("i.status = 'pending'");
    expect(preview).toContain("i.expires_at > now()");
    expect(preview).toContain("'***@'");
  });

  it("reserves creating a district for super admins", () => {
    expect(migration).toContain("when type = 'district' then public.is_super_admin()");
    expect(migration).toContain("district_creation_requires_super_admin");
    expect(migration).toContain("public.is_unlocked_coach(auth.uid())");
  });
});

describe("district provision pack", () => {
  it("gates both district entry points on super admin", () => {
    expect(adminActions).toContain(
      'parsed.data.type === "district" && !(await getSuperAdminUser())'
    );
    expect(adminActions).toContain(
      "const admin = await getSuperAdminUser();\n  if (!admin) return { ok: false, error: SUPER_ADMIN_DISTRICT_MESSAGE };"
    );
    expect(adminOrgsPage).toContain("isCurrentUserSuperAdmin()");
    expect(explorer).toContain("canProvisionDistrict");
  });

  it("creates the district and its first administrator invitation together", () => {
    expect(adminActions).toContain("adminProvisionDistrict");
    expect(adminActions).toContain('role: "district_admin"');
    expect(adminActions).toContain("activationCode: invitation.activationCode");
  });

  it("reports a district that exists without an invitation instead of claiming success", () => {
    expect(adminActions).toContain("invitationError: invitation.error");
    expect(provisionForm).toContain(
      "District created, but the invitation did not send"
    );
  });

  it("passes the one-time code through the invitation action", () => {
    expect(districtActions).toContain("activationCode: row.activation_code ?? null");
    expect(districtActions).toContain("claimOrganizationInvitationByCode");
    expect(districtActions).toContain('consumeRateLimit(\n    "claim"');
  });

  it("tells the operator the code cannot be shown again", () => {
    expect(provisionForm).toContain("Shown once");
    expect(provisionForm).toContain("reissue the invitation");
    expect(invitationCopyRow).toContain("Copy {label.toLowerCase()}");
  });

  it("keeps the code entry page unindexed and fails closed", () => {
    expect(claimCodePage).toContain("robots: { index: false, follow: false }");
    expect(claimCodePage).toContain('referrer: "no-referrer"');
    expect(claimCodePage).toContain("if (!invitation)");
    expect(claimCodePage).toContain(
      "That code is invalid, expired, or already used."
    );
  });
});

describe("school provision pack", () => {
  it("gates child-school provision on super admin and an existing district", () => {
    expect(schoolMigration).toContain("not public.is_super_admin()");
    expect(schoolMigration).toContain("super_admin_required");
    expect(schoolMigration).toContain("district.type is distinct from 'district'");
    expect(adminActions).toContain("adminProvisionDistrictSchool");
    expect(adminActions).toContain("SUPER_ADMIN_SCHOOL_MESSAGE");
    expect(explorer).toContain("Provision school");
    expect(explorer).toContain("AdminSchoolProvisionForm");
  });

  it("creates a connected school without making the founder a school administrator", () => {
    expect(schoolMigration).toContain(
      "parent_org_id,\n    created_by,\n    owner_profile_id"
    );
    expect(schoolMigration).toContain(
      "p_district_id,\n    actor,\n    coalesce(district.owner_profile_id, actor)"
    );
    expect(schoolMigration).not.toContain("insert into public.org_memberships");
    expect(schoolMigration).toContain("'school_admin'");
  });

  it("returns a one-time claim pack and keeps the school if the invite fails", () => {
    expect(schoolMigration).toContain("activation_code text");
    expect(schoolMigration).toContain("encode(digest(raw_code, 'sha256'), 'hex')");
    expect(schoolMigration).not.toMatch(
      /insert into public.org_invitations[\s\S]*?activation_code text/
    );
    expect(adminActions).toContain("invitationError:");
    expect(schoolProvisionForm).toContain(
      "School created, but the invitation did not send"
    );
    expect(schoolProvisionForm).toContain("is a school account");
  });

  it("stops orphan-school create from the admin directory", () => {
    expect(adminActions).toContain("ORPHAN_SCHOOL_MESSAGE");
    expect(adminActions).toContain("Schools belong under a district. Use Provision school.");
    expect(adminActions).toContain("USE_DISTRICT_PACK_MESSAGE");
    expect(explorer).not.toContain("AdminOrganizationForm");
    expect(explorer).not.toContain("Add organization");
    expect(explorer).toContain("School account");
    expect(explorer).toContain("part of ${org.parent.name}");
  });

  it("shows named-admin status from a platform-admin staffing RPC", () => {
    expect(schoolMigration).toContain("get_admin_school_staffing");
    expect(schoolMigration).toContain("platform_admin_required");
    expect(adminActions).not.toContain("get_admin_school_staffing");
    expect(readRepoFile("lib/data/admin.ts")).toContain(
      'supabase.rpc("get_admin_school_staffing")'
    );
    expect(readRepoFile("lib/data/admin.ts")).toContain(
      "Needs school administrator"
    );
    expect(explorer).toContain("School administrator status unavailable");
  });

  it("surfaces the activation code on People invite success", () => {
    expect(peopleManager).toContain("setActivationCode(result.activationCode)");
    expect(peopleManager).toContain("formatActivationCode(activationCode)");
    expect(peopleManager).toContain("Copy code");
    expect(peopleManager).toContain("type the code at /claim");
  });
});
