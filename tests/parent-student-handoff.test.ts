import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const signupPage = readFileSync(
  resolve(process.cwd(), "app/signup/page.tsx"),
  "utf8"
);
const familyPage = readFileSync(
  resolve(process.cwd(), "app/family/page.tsx"),
  "utf8"
);
const handoff = readFileSync(
  resolve(process.cwd(), "components/StudentAccountHandoff.tsx"),
  "utf8"
);
const parentGate = readFileSync(
  resolve(process.cwd(), "components/ParentStudentSignupGate.tsx"),
  "utf8"
);
const alreadySignedIn = readFileSync(
  resolve(process.cwd(), "components/AlreadySignedInSignup.tsx"),
  "utf8"
);
const linkChildForm = readFileSync(
  resolve(process.cwd(), "components/LinkChildForm.tsx"),
  "utf8"
);

describe("parent → student separate-device handoff", () => {
  it("blocks student signup while a parent session is active", () => {
    expect(signupPage).toContain("getSessionUser");
    expect(signupPage).toContain("getCurrentProfile");
    expect(signupPage).toContain("ParentStudentSignupGate");
    expect(signupPage).toContain('profile.role === "parent"');
    expect(signupPage).toContain("requestedSignupRole");
    expect(signupPage).toContain('requestedSignupRole === "student"');
    expect(signupPage).toContain("AlreadySignedInSignup");
    expect(parentGate).toContain("Open this on the student’s device");
    expect(parentGate).toContain("/family#student-account-setup");
    expect(parentGate).not.toContain("SignupForm");
  });

  it("keeps claim acceptance on the claim route for signed-in users", () => {
    expect(signupPage).toContain("isClaimPath && invitation && requestedPath");
    expect(signupPage).toContain("redirect(requestedPath)");
  });

  it("tells already-signed-in visitors not to replace their session", () => {
    expect(alreadySignedIn).toContain("You’re already signed in");
    expect(alreadySignedIn).toContain("workspaceOpenCta");
    expect(alreadySignedIn).toContain("one account per person");
  });

  it("leads the empty Family desk with student setup before linking", () => {
    expect(familyPage).toContain("Set up your student’s account");
    expect(familyPage).toContain(
      'label: "Set up student account"'
    );
    expect(familyPage).toContain(
      'label: "Student already has an account"'
    );
    expect(familyPage).toContain(
      "Stay signed in here as the parent, then link after they confirm."
    );
    // Primary mission must not jump straight to the link form first.
    expect(familyPage).not.toContain(
      'missionAction = pendingCount\n      ? { href: "#tell-student", label: "What to tell your student" }\n      : { href: "#link-student", label: "Link a student" }'
    );
  });

  it("makes session and credential ownership explicit in the handoff", () => {
    expect(handoff).toContain("Do not open the student signup link in this browser");
    expect(handoff).toContain("Use the student’s email, not yours");
    expect(handoff).toContain("Keep this parent session");
    expect(handoff).toContain("private window");
    expect(linkChildForm).toContain("not your parent email");
  });
});
