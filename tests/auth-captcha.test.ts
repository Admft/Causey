import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("authentication CAPTCHA protection", () => {
  it("passes an hCaptcha token through every web email/password auth path", () => {
    const signup = read("components/SignupForm.tsx");
    const login = read("components/LoginForm.tsx");
    const recovery = read("components/ForgotPasswordForm.tsx");

    expect(read("components/AuthCaptcha.tsx")).toContain(
      "NEXT_PUBLIC_HCAPTCHA_SITE_KEY"
    );
    expect(signup).toContain("captchaToken: captchaToken ?? undefined");
    expect(signup).toContain("supabase.auth.resend");
    expect(login).toContain("options: { captchaToken: captchaToken ?? undefined }");
    expect(recovery).toContain("captchaToken: captchaToken ?? undefined");
    const account = read("components/AccountSecurityForm.tsx");
    expect(account).toContain(
      "options: { captchaToken: emailCaptchaToken ?? undefined }"
    );
    expect(account).toContain(
      "options: { captchaToken: passwordCaptchaToken ?? undefined }"
    );
    expect(account).toContain(
      "captchaToken: resetCaptchaToken ?? undefined"
    );
  });

  it("allows hCaptcha scripts, requests, and frames through the CSP", () => {
    const config = read("next.config.ts");
    expect(config).toContain("https://*.hcaptcha.com");
    expect(config).toContain("frame-src https://hcaptcha.com");
  });

  it("passes CAPTCHA tokens through mobile signup, sign-in, and recovery", () => {
    const auth = read("mobile/src/auth.tsx");
    const login = read("mobile/app/login.tsx");
    const signup = read("mobile/app/signup.tsx");
    const recovery = read("mobile/app/forgot-password.tsx");

    expect(read("mobile/src/MobileCaptcha.tsx")).toContain(
      "EXPO_PUBLIC_HCAPTCHA_SITE_KEY"
    );
    expect(auth).toContain("captchaToken: input.captchaToken ?? undefined");
    expect(auth).toContain("captchaToken: captchaToken ?? undefined");
    expect(login).toContain("captchaRef.current?.verify()");
    expect(signup).toContain("captchaRef.current?.verify()");
    expect(recovery).toContain("captchaRef.current?.verify()");
  });
});
