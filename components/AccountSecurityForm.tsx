"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { recordAccountInAppAlert } from "@/lib/actions/notifications";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  AUTH_CAPTCHA_ENABLED,
  AuthCaptcha,
  CAPTCHA_REQUIRED_MESSAGE,
} from "@/components/AuthCaptcha";
import { PasswordField } from "@/components/PasswordField";
import {
  WEAK_PASSWORD_MESSAGE,
  isPasswordAcceptable,
} from "@/lib/password-strength";

function passwordVerificationMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "";
  if (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed")
  ) {
    return "Confirm this email first. Check your inbox for the confirmation link, then try again.";
  }
  if (message.includes("rate") || message.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (message.includes("captcha")) {
    return "Complete the security check, then try again.";
  }
  if (
    message.includes("invalid login") ||
    message.includes("invalid credentials") ||
    message.includes("invalid_grant")
  ) {
    return "Current password is incorrect.";
  }
  console.error("Account password verification failed:", error);
  return "Could not verify your current password. Check your connection and try again.";
}

function accountErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    (error.message === "Current password is incorrect." ||
      error.message === CAPTCHA_REQUIRED_MESSAGE ||
      error.message.startsWith("Confirm this email") ||
      error.message.startsWith("Too many attempts") ||
      error.message.startsWith("Complete the security check") ||
      error.message.startsWith("Could not verify your current password"))
  ) {
    return error.message;
  }
  console.error("Account security request failed:", error);
  return fallback;
}

/**
 * Official sign-in controls for /account: change email and change password.
 * Email changes and in-place password changes require the current password;
 * password reset by email is also offered.
 */
export function AccountSecurityForm({
  email,
  emailConfirmed,
  pendingEmail,
}: {
  email: string;
  emailConfirmed: boolean;
  pendingEmail: string | null;
}) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [passwordMethod, setPasswordMethod] = useState<"current" | "email">(
    "current"
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [emailCaptchaToken, setEmailCaptchaToken] = useState<string | null>(
    null
  );
  const [emailCaptchaVersion, setEmailCaptchaVersion] = useState(0);
  const [passwordCaptchaToken, setPasswordCaptchaToken] = useState<
    string | null
  >(null);
  const [passwordCaptchaVersion, setPasswordCaptchaVersion] = useState(0);
  const [resetCaptchaToken, setResetCaptchaToken] = useState<string | null>(
    null
  );
  const [resetCaptchaVersion, setResetCaptchaVersion] = useState(0);

  async function onChangeEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setEmailMessage(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (next === email.toLowerCase()) {
      setEmailError("That is already your current email.");
      return;
    }
    setEmailPending(true);
    try {
      if (AUTH_CAPTCHA_ENABLED && !emailCaptchaToken) {
        throw new Error(CAPTCHA_REQUIRED_MESSAGE);
      }
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: emailPassword,
        options: { captchaToken: emailCaptchaToken ?? undefined },
      });
      if (authError) {
        throw new Error(passwordVerificationMessage(authError));
      }
      const { error: updateError } = await supabase.auth.updateUser(
        { email: next },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account#signin")}`,
        }
      );
      if (updateError) throw updateError;
      setNewEmail("");
      setEmailPassword("");
      setEmailMessage(
        `Confirmation requested. Your sign-in email stays ${email} until the new address is confirmed — check ${next} for the confirmation link${
          emailConfirmed ? " (and possibly your current inbox too)" : ""
        }.`
      );
      void recordAccountInAppAlert("email_change_pending");
      router.refresh();
    } catch (err) {
      setEmailError(
        accountErrorMessage(
          err,
          "Could not start the email change. Check your connection and try again."
        )
      );
    } finally {
      setEmailPending(false);
      setEmailCaptchaToken(null);
      setEmailCaptchaVersion((current) => current + 1);
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (!isPasswordAcceptable(password)) {
      setPasswordError(WEAK_PASSWORD_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setPasswordError("New passwords don’t match.");
      return;
    }
    if (password === currentPassword) {
      setPasswordError("Choose a new password that is different from the current one.");
      return;
    }
    setPasswordPending(true);
    try {
      if (AUTH_CAPTCHA_ENABLED && !passwordCaptchaToken) {
        throw new Error(CAPTCHA_REQUIRED_MESSAGE);
      }
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
        options: { captchaToken: passwordCaptchaToken ?? undefined },
      });
      if (authError) {
        throw new Error(passwordVerificationMessage(authError));
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setPasswordMessage("Password updated. Use it the next time you sign in.");
      void recordAccountInAppAlert("password_updated");
      router.refresh();
    } catch (err) {
      setPasswordError(
        accountErrorMessage(
          err,
          "Could not update the password. Check your connection and try again."
        )
      );
    } finally {
      setPasswordPending(false);
      setPasswordCaptchaToken(null);
      setPasswordCaptchaVersion((current) => current + 1);
    }
  }

  async function onSendPasswordReset() {
    setResetError(null);
    setResetMessage(null);
    setResetPending(true);
    try {
      if (AUTH_CAPTCHA_ENABLED && !resetCaptchaToken) {
        throw new Error(CAPTCHA_REQUIRED_MESSAGE);
      }
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
        captchaToken: resetCaptchaToken ?? undefined,
      });
      if (error) throw error;
      setResetMessage(
        `If ${email} is correct, you’ll receive a reset link. Open it to choose a new password.`
      );
      void recordAccountInAppAlert("password_reset_requested");
    } catch (err) {
      console.error("Password reset request failed:", err);
      const message = err instanceof Error ? err.message : "";
      setResetError(
        message === CAPTCHA_REQUIRED_MESSAGE ||
          message.toLowerCase().includes("captcha")
          ? "Complete the security check, then try again."
          : "Could not send the reset email. Try again."
      );
    } finally {
      setResetPending(false);
      setResetCaptchaToken(null);
      setResetCaptchaVersion((current) => current + 1);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="text-sm font-semibold text-foreground">Current email</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-4">
          <dt className="text-muted-strong">Address</dt>
          <dd className="font-medium text-foreground">{email}</dd>
          <dt className="text-muted-strong">Status</dt>
          <dd className="text-muted">
            {emailConfirmed
              ? "Confirmed"
              : "Not confirmed — check your inbox for the confirmation link"}
          </dd>
          {pendingEmail ? (
            <>
              <dt className="text-muted-strong">Pending</dt>
              <dd className="text-muted">
                Waiting for confirmation at{" "}
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="border-t border-line pt-8">
        <h3 className="text-sm font-semibold text-foreground">Change email</h3>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Enter a new address and your current password. We&rsquo;ll email a
          confirmation link to the new address before the change takes effect.
        </p>
        <form
          onSubmit={onChangeEmail}
          className="mt-5 flex max-w-md flex-col gap-4"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              New email
            </span>
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              Current password
            </span>
            <input
              className="field"
              type="password"
              required
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
            />
          </label>
          {AUTH_CAPTCHA_ENABLED ? (
            <AuthCaptcha
              key={emailCaptchaVersion}
              onTokenChange={setEmailCaptchaToken}
            />
          ) : null}
          {emailError ? (
            <p className="text-sm font-medium text-brand-red" role="alert">
              {emailError}
            </p>
          ) : null}
          {emailMessage ? (
            <p className="text-sm font-medium text-foreground" role="status">
              {emailMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={
              emailPending || (AUTH_CAPTCHA_ENABLED && !emailCaptchaToken)
            }
            className="cta-enabled w-fit disabled:opacity-60"
          >
            {emailPending ? "Sending confirmation…" : "Change email"}
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-8">
        <h3 className="text-sm font-semibold text-foreground">
          Change password
        </h3>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Use your current password here, or email yourself a reset link.
        </p>

        <fieldset className="mt-5">
          <legend className="sr-only">How to change your password</legend>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="password-method"
                checked={passwordMethod === "current"}
                onChange={() => {
                  setPasswordMethod("current");
                  setResetError(null);
                  setResetMessage(null);
                }}
                className="mt-1 size-4 accent-[var(--brand-red)]"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Enter current password
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Change it now without leaving this page.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="password-method"
                checked={passwordMethod === "email"}
                onChange={() => {
                  setPasswordMethod("email");
                  setPasswordError(null);
                  setPasswordMessage(null);
                }}
                className="mt-1 size-4 accent-[var(--brand-red)]"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Email me a reset link
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Send a link to {email} to choose a new password.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {passwordMethod === "current" ? (
          <form
            onSubmit={onChangePassword}
            className="mt-5 flex max-w-md flex-col gap-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-strong">
                Current password
              </span>
              <input
                className="field"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <PasswordField
              label="New password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              showStrength
            />
            <PasswordField
              label="Confirm new password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
            />
            {AUTH_CAPTCHA_ENABLED ? (
              <AuthCaptcha
                key={passwordCaptchaVersion}
                onTokenChange={setPasswordCaptchaToken}
              />
            ) : null}
            {passwordError ? (
              <p className="text-sm font-medium text-brand-red" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? (
              <p className="text-sm font-medium text-foreground" role="status">
                {passwordMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={
                passwordPending ||
                (AUTH_CAPTCHA_ENABLED && !passwordCaptchaToken)
              }
              className="cta-enabled w-fit disabled:opacity-60"
            >
              {passwordPending ? "Updating…" : "Change password"}
            </button>
          </form>
        ) : (
          <div className="mt-5 max-w-md">
            <p className="text-sm text-muted">
              We&rsquo;ll send a one-time link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Open it to set a new password.
            </p>
            {AUTH_CAPTCHA_ENABLED ? (
              <div className="mt-4">
                <AuthCaptcha
                  key={resetCaptchaVersion}
                  onTokenChange={setResetCaptchaToken}
                />
              </div>
            ) : null}
            {resetError ? (
              <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
                {resetError}
              </p>
            ) : null}
            {resetMessage ? (
              <p className="mt-3 text-sm font-medium text-foreground" role="status">
                {resetMessage}
              </p>
            ) : null}
            <button
              type="button"
              disabled={
                resetPending || (AUTH_CAPTCHA_ENABLED && !resetCaptchaToken)
              }
              onClick={() => void onSendPasswordReset()}
              className="cta-enabled mt-4 w-fit disabled:opacity-60"
            >
              {resetPending ? "Sending…" : "Send reset email"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
