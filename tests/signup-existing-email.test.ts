import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXISTING_ACCOUNT_HEADING,
  isAlreadyRegisteredAuthError,
  isExistingAccountSignup,
} from "@/lib/auth/signup-result";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("isExistingAccountSignup", () => {
  it("treats an empty identities list as an already-registered email", () => {
    expect(isExistingAccountSignup({ identities: [] })).toBe(true);
  });

  it("lets a real new signup wait for confirmation", () => {
    expect(
      isExistingAccountSignup({
        identities: [{ identity_id: "email" }],
      })
    ).toBe(false);
    expect(isExistingAccountSignup(null)).toBe(false);
    expect(isExistingAccountSignup({ identities: null })).toBe(false);
  });

  it("maps Supabase already-registered errors", () => {
    expect(isAlreadyRegisteredAuthError("User already registered")).toBe(true);
    expect(
      isAlreadyRegisteredAuthError("A user with this email has already been registered")
    ).toBe(true);
    expect(isAlreadyRegisteredAuthError("Could not create the account.")).toBe(
      false
    );
  });

  it("website and phone tell the person the email is taken and to sign in", () => {
    const website = read("components/SignupForm.tsx");
    const phoneAuth = read("mobile/src/auth.tsx");
    const phoneSignup = read("mobile/app/signup.tsx");
    expect(website).toContain("isExistingAccountSignup(data.user)");
    expect(website).toContain("EXISTING_ACCOUNT_HEADING");
    expect(website).toContain('className="cta-enabled inline-flex"');
    expect(website).toContain("Sign in");
    expect(EXISTING_ACCOUNT_HEADING).toBe(
      "An account for that email already exists"
    );
    expect(phoneAuth).toContain("data.user.identities.length === 0");
    expect(phoneAuth).toContain(
      "An account for that email already exists. Sign in."
    );
    expect(phoneSignup).toContain("An account for that email already exists");
    expect(phoneSignup).toContain('label="Sign in"');
    expect(phoneSignup).toContain('router.replace("/login")');
  });
});
