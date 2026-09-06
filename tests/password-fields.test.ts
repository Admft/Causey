import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const signupForm = read("components/SignupForm.tsx");
const loginForm = read("components/LoginForm.tsx");
const passwordField = read("components/PasswordField.tsx");

describe("password confirmation and visibility", () => {
  it("requires confirm password on every signup, not only students", () => {
    expect(signupForm).toContain('label="Confirm password"');
    expect(signupForm).toContain("if (password !== confirmPassword)");
    expect(signupForm).toContain("Passwords don’t match.");
    const studentOnlyFields = signupForm.slice(
      signupForm.indexOf('{role === "student" ? (')
    );
    expect(studentOnlyFields).toContain("Date of birth");
    expect(studentOnlyFields).not.toContain("Confirm password");
  });

  it("lets signup and sign-in reveal what was typed", () => {
    expect(signupForm).toContain("<PasswordField");
    expect(loginForm).toContain("<PasswordField");
    expect(loginForm).toContain('autoComplete="current-password"');
    expect(passwordField).toContain('aria-label={`${action} ${label.toLowerCase()}`}');
    expect(passwordField).toContain("aria-pressed={visible}");
    expect(passwordField).toContain('type={visible ? "text" : "password"}');
    expect(passwordField).toContain('type="button"');
    expect(read("app/globals.css")).toContain(".field.field-password::-ms-reveal");
    expect(signupForm).toContain("showStrength");
    expect(signupForm).toContain("isPasswordAcceptable");
    expect(signupForm).toContain("WEAK_PASSWORD_MESSAGE");
    expect(passwordField).toContain("password-strength-track");
    expect(passwordField).toContain('role="meter"');
    expect(loginForm).not.toContain("showStrength");
    expect(read("components/ResetPasswordForm.tsx")).toContain("showStrength");
    expect(read("components/AccountSecurityForm.tsx")).toContain(
      "isPasswordAcceptable"
    );
  });
});
