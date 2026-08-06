"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  ageBandFromDateOfBirth,
  ageBandLabel,
  parseDateOnly,
} from "@/lib/auth/age-band";
import { homePathForRole } from "@/lib/auth/home-path";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { ROLE_OPTIONS, type AccountRole, type AgeBand } from "@/lib/auth/types";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function SignupForm({
  initialRole = "student",
  next,
}: {
  initialRole?: AccountRole;
  next?: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [chessInterest, setChessInterest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const derivedBand = useMemo((): AgeBand | null => {
    if (!dateOfBirth || !parseDateOnly(dateOfBirth)) return null;
    try {
      return ageBandFromDateOfBirth(dateOfBirth);
    } catch {
      return null;
    }
  }, [dateOfBirth]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Supabase is not configured in .env.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      let ageBand: AgeBand | null = null;
      if (role === "student") {
        if (!dateOfBirth) {
          throw new Error("Enter your date of birth.");
        }
        ageBand = ageBandFromDateOfBirth(dateOfBirth);
      }
      if (zip && !/^\d{5}$/.test(zip)) {
        throw new Error("Zip must be 5 digits.");
      }

      const interests = chessInterest ? ["chess"] : [];
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      if (next) callbackUrl.searchParams.set("next", next);

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          data: {
            role,
            display_name: displayName.trim(),
            date_of_birth: role === "student" ? dateOfBirth : null,
            age_band: ageBand,
            state: state || null,
            zip: zip || null,
            interests,
          },
        },
      });

      if (signError) throw signError;

      // Email confirmation required — no session until they click the link.
      if (!data.session) {
        setNeedsConfirm(true);
        return;
      }

      router.push(next ?? homePathForRole(role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setPending(false);
    }
  }

  if (needsConfirm) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-display-sm font-bold text-foreground">
          Check your email
        </h2>
        <p className="mt-3 text-sm text-muted">
          We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
          Open it to finish creating your account
          {next
            ? " and continue where you left off."
            : " and sign in to Causey."}
        </p>
        <Link href="/login" className="cta-enabled mt-6 inline-flex">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-muted-strong">Account type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-brand-red/40 bg-accent-soft"
                    : "border-line bg-white hover:border-brand-red/30"
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {opt.label}
                </span>
                <span className="mt-1 block text-2xs text-muted">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">Display name</span>
          <input
            className="field"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
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
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">Password</span>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        {role === "student" ? (
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-muted-strong">
              Date of birth
            </span>
            <input
              className="field"
              type="date"
              required
              value={dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateOfBirth(e.target.value)}
              autoComplete="bday"
            />
            {derivedBand ? (
              <span className="text-2xs text-muted">
                Age band: {ageBandLabel(derivedBand)}
              </span>
            ) : null}
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">State</span>
          <select
            className="field"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Optional</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">Zip</span>
          <input
            className="field"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-foreground sm:col-span-2">
          <input
            type="checkbox"
            checked={chessInterest}
            onChange={(e) => setChessInterest(e.target.checked)}
          />
          Interested in chess
        </label>
      </div>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-red hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
