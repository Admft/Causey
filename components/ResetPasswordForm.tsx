"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  WEAK_PASSWORD_MESSAGE,
  isPasswordAcceptable,
} from "@/lib/password-strength";

/** Reached from the email link (session already established by the callback). */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordAcceptable(password)) {
      setError(WEAK_PASSWORD_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError(
          "This page only works from the reset link in your email — request a new one from “Forgot password”."
        );
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.push("/account#signin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <PasswordField
        label="New password"
        required
        minLength={8}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        showStrength
      />
      <PasswordField
        label="Confirm new password"
        required
        minLength={8}
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
