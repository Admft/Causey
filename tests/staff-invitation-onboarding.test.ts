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

describe("staff invitation onboarding", () => {
  it("previews only valid pending invitations without exposing full email", () => {
    expect(migration).toContain(
      "create or replace function public.get_org_invitation_preview"
    );
    expect(migration).toContain("i.status = 'pending'");
    expect(migration).toContain("i.expires_at > now()");
    expect(migration).toContain("email_hint");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).not.toMatch(/returns table \([\s\S]*?\bemail text\b/);
  });

  it("moves staff claims to the coach workspace without unlocking restrictions", () => {
    expect(migration).toContain(
      "'assistant_coach', 'coach', 'school_admin', 'district_admin'"
    );
    expect(migration).toContain("set role = 'coach', updated_at = now()");
    expect(migration).not.toMatch(/set[\s\S]*role_unlocked\s*=/i);
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
});
