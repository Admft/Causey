"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { homePathForRole } from "@/lib/auth/home-path";
import type { AccountRole } from "@/lib/auth/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Account sign-in is unavailable in this build.");
      }
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
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
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setError("Email or password is incorrect.");
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("Confirm your email before signing in.");
      } else {
        console.error("Sign-in failed:", err);
        setError("Could not sign in. Check your connection and try again.");
      }
    } finally {
      setPending(false);
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
      <PasswordField
        label="Password"
        required
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled w-full disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-muted">
        New here?{" "}
        <Link
          href={signupHref}
          className="font-semibold text-brand-red hover:underline"
        >
          {createAccountLabel}
        </Link>
        {" · "}
        <Link
          href="/forgot-password"
          className="font-medium text-muted-strong hover:text-foreground"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
