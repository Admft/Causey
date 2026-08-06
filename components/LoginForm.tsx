"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { homePathForRole } from "@/lib/auth/home-path";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";
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
        throw new Error("Supabase is not configured in .env.");
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
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">Password</span>
        <input
          className="field"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-muted">
        New here?{" "}
        <Link
          href={signupHref}
          className="font-semibold text-brand-red hover:underline"
        >
          Create an account
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
