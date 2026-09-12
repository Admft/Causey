"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { homePathForRole } from "@/lib/auth/home-path";
import type { AccountRole } from "@/lib/auth/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  AUTH_CAPTCHA_ENABLED,
  AuthCaptcha,
  CAPTCHA_REQUIRED_MESSAGE,
} from "@/components/AuthCaptcha";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm({
  next,
  joiningOrganization = false,
  claimingInvitation = false,
  claimAccountRole,
}: {
  next?: string;
  joiningOrganization?: boolean;
  claimingInvitation?: boolean;
  claimAccountRole?: AccountRole;
}) {
  const router = useRouter();
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";
  const createAccountLabel = claimingInvitation
    ? claimAccountRole === "coach"
      ? "Create a staff account"
      : "Create a student account"
    : joiningOrganization
      ? "Create a student account"
      : "Create an account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Account sign-in is unavailable in this build.");
      }
      if (AUTH_CAPTCHA_ENABLED && !captchaToken) {
        throw new Error(CAPTCHA_REQUIRED_MESSAGE);
      }
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: { captchaToken: captchaToken ?? undefined },
      });
      if (signError) throw signError;

      let destination = next;
      if (!destination) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let role: string | null = null;
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          role = profile?.role ?? null;
        }
        destination = homePathForRole(role);
      }

      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Account sign-in is unavailable in this build.") {
        setError(message);
      } else if (
        message === CAPTCHA_REQUIRED_MESSAGE ||
        message.toLowerCase().includes("captcha")
      ) {
        setError("Complete the security check again.");
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setError(
          "Email or password is incorrect. Reset your password or create an account if you’re new to Causey."
        );
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("Confirm your email before signing in.");
      } else {
        console.error("Sign-in failed:", err);
        setError("Could not sign in. Check your connection and try again.");
      }
    } finally {
      setPending(false);
      setCaptchaToken(null);
      setCaptchaVersion((current) => current + 1);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Email</span>
        <input
          className="field"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <div className="flex flex-col gap-1">
        <PasswordField
          label="Password"
          required
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Link
          href="/forgot-password"
          className="self-start text-sm font-medium text-muted-strong hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>

      <AuthCaptcha
        key={captchaVersion}
        onTokenChange={setCaptchaToken}
      />

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled w-full disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div>
        <p className="text-sm text-muted">
          New here?{" "}
          <Link
            href={signupHref}
            className="font-semibold text-brand-red hover:underline"
          >
            {createAccountLabel}
          </Link>
        </p>
        <p className="section-rule mt-4 pt-4 text-sm">
          <Link
            href="/support"
            className="font-medium text-muted-strong hover:text-foreground"
          >
            Report a problem
          </Link>
        </p>
      </div>
    </form>
  );
}
