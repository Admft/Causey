import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isExistingAccountSignup } from "@/lib/auth/signup-result";

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

  it("website and phone signup send people to sign in instead of a fake confirmation", () => {
    const website = read("components/SignupForm.tsx");
    const phone = read("mobile/src/auth.tsx");
    expect(website).toContain("isExistingAccountSignup(data.user)");
    expect(website).toContain(
      "An account may already use this email. Try signing in."
    );
    expect(phone).toContain("data.user.identities.length === 0");
    expect(phone).toContain(
      "An account may already use this email. Try signing in."
    );
  });
});
