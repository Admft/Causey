import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0029_staff_invitation_onboarding.sql"
  ),
  "utf8"
);
const scopedAuthorityMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0030_scoped_staff_authority.sql"),
  "utf8"
);
const claimPage = readFileSync(
  resolve(process.cwd(), "app/claim/[token]/page.tsx"),
  "utf8"
);
const signupPage = readFileSync(
  resolve(process.cwd(), "app/signup/page.tsx"),
  "utf8"
);
const signupForm = readFileSync(
  resolve(process.cwd(), "components/SignupForm.tsx"),
  "utf8"
);
const orgsPage = readFileSync(
  resolve(process.cwd(), "app/orgs/page.tsx"),
  "utf8"
);
const authNav = readFileSync(
  resolve(process.cwd(), "components/AuthNav.tsx"),
  "utf8"
);
const claimButton = readFileSync(
  resolve(process.cwd(), "components/ClaimInvitationButton.tsx"),
  "utf8"
);
const tournamentActions = readFileSync(
  resolve(process.cwd(), "lib/actions/tournaments.ts"),
  "utf8"
);

describe("staff invitation onboarding", () => {
  it("previews only valid pending invitations without exposing full email", () => {
    expect(migration).toContain(
      "create or replace function public.get_org_invitation_preview"
    );
    expect(migration).toContain("i.status = 'pending'");
    expect(migration).toContain("i.expires_at > now()");
    expect(migration).toContain("email_hint");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).toContain("extensions.digest");
    expect(migration).not.toMatch(/returns table \([\s\S]*?\bemail text\b/);
  });

  it("preserves the claimant's global student or parent persona", () => {
    expect(migration).not.toMatch(/update\s+public\.profiles/i);
    expect(
      scopedAuthorityMigration.split("-- The first 0029 version")[0]
    ).not.toMatch(/update\s+public\.profiles/i);
    expect(scopedAuthorityMigration).toContain(
      "insert into public.org_memberships"
    );
    expect(scopedAuthorityMigration).toContain("affected_claimants");
    expect(scopedAuthorityMigration).toContain(
      "set search_path = public, extensions"
    );
    expect(scopedAuthorityMigration).toContain(
      "e.detail->>'from_role' in ('student', 'parent')"
    );
  });

  it("fails closed before offering account creation", () => {
    expect(claimPage).toContain("if (!invitation)");
    expect(claimPage).toContain("before creating an account");
    expect(claimPage).toContain("getOrganizationInvitationPreview(token)");
  });

  it("locks invitation signup to the correct account persona", () => {
    expect(signupPage).toContain("invitationAccountRole");
    expect(signupPage).toContain("getOrganizationInvitationPreview");
    expect(signupForm).toContain("invitation?.accountRole ?? initialRole");
    expect(signupForm).toContain('"Create staff account"');
  });

  it("derives staff workspace navigation from scoped memberships", () => {
    expect(orgsPage).toContain("hasStaffMembership");
    expect(orgsPage).toContain("isStaffWorkspace");
    expect(authNav).toContain("hasOrgStaffAccess");
    expect(authNav).toContain('"school_admin"');
  });

  it("allows scoped staff to create organization tournaments", () => {
    expect(scopedAuthorityMigration).toContain(
      "public.is_org_staff(org_id, auth.uid())"
    );
    expect(scopedAuthorityMigration).toContain(
      "org_id is null"
    );
    expect(tournamentActions).toContain(
      'supabase.rpc("is_org_staff"'
    );
  });

  it("keeps claim tokens out of history and search indexing", () => {
    expect(claimPage).toContain("index: false");
    expect(claimPage).toContain('"no-referrer"');
    expect(claimButton).toContain("router.replace");
  });
});
