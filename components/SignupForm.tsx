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
import {
  EXISTING_ACCOUNT_HEADING,
  isAlreadyRegisteredAuthError,
  isExistingAccountSignup,
} from "@/lib/auth/signup-result";
import { ROLE_OPTIONS, type AccountRole, type AgeBand } from "@/lib/auth/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { assertSignupAllowed } from "@/lib/actions/signup-guard";
import {
  DISCOVERY_CATEGORIES,
  type DiscoveryCategory,
} from "@/lib/category-discovery";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import {
  AUTH_CAPTCHA_ENABLED,
  AuthCaptcha,
  CAPTCHA_REQUIRED_MESSAGE,
} from "@/components/AuthCaptcha";
import { PasswordField } from "@/components/PasswordField";
import {
  UseLocationControl,
  ZipCaptureField,
} from "@/components/ZipCaptureField";
import {
  WEAK_PASSWORD_MESSAGE,
  isPasswordAcceptable,
} from "@/lib/password-strength";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const ROLE_SIGNUP_COPY: Record<
  AccountRole,
  {
    nameLabel: string;
    nameHelp: string;
    confirmationStep: { title: string; copy: string };
  }
> = {
  student: {
    nameLabel: "Student name",
    nameHelp: "This is the name coaches see on school and club rosters.",
    confirmationStep: {
      title: "Join your school or club",
      copy: "Use a coach link, then track invites on Plan.",
    },
  },
  parent: {
    nameLabel: "Your name",
    nameHelp: "Use the name your student will recognize.",
    confirmationStep: {
      title: "Open Family",
      copy: "Your student needs their own account before you can link.",
    },
  },
  coach: {
    nameLabel: "Your name",
    nameHelp: "Use the name your club knows you by.",
    confirmationStep: {
      title: "Create your club",
      copy: "Start from My clubs.",
    },
  },
};

const SAFE_SIGNUP_ERRORS = new Set([
  "Account creation is unavailable in this build.",
  "Password must be at least 8 characters.",
  WEAK_PASSWORD_MESSAGE,
  "Passwords don’t match.",
  "Enter your date of birth.",
  "Enter a valid date of birth.",
  "Date of birth can’t be in the future.",
  "Zip must be 5 digits.",
  CAPTCHA_REQUIRED_MESSAGE,
  "That action is happening too often. Wait a minute and try again.",
]);

export function SignupForm({
  initialRole = "student",
  next,
  joiningOrganization = false,
  invitation,
}: {
  initialRole?: AccountRole;
  next?: string;
  joiningOrganization?: boolean;
  invitation?: {
    orgName: string;
    roleLabel: string;
    accountRole: "student" | "coach";
  };
}) {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>(
    joiningOrganization
      ? "student"
      : invitation?.accountRole ?? initialRole
  );
  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  // New accounts start with no selected interests; nothing is prechecked.
  const [interests, setInterests] = useState<Set<DiscoveryCategory>>(
    () => new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [resendState, setResendState] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);

  const derivedBand = useMemo((): AgeBand | null => {
    if (!dateOfBirth || !parseDateOnly(dateOfBirth)) return null;
    try {
      return ageBandFromDateOfBirth(dateOfBirth);
    } catch {
      return null;
    }
  }, [dateOfBirth]);
  const roleOption =
    ROLE_OPTIONS.find((option) => option.value === role) ?? ROLE_OPTIONS[0];
  const roleCopy = ROLE_SIGNUP_COPY[role];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);
    setPending(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Account creation is unavailable in this build.");
      }
      if (!isPasswordAcceptable(password)) {
        throw new Error(WEAK_PASSWORD_MESSAGE);
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords don’t match.");
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
      if (AUTH_CAPTCHA_ENABLED && !captchaToken) {
        throw new Error(CAPTCHA_REQUIRED_MESSAGE);
      }

      const selectedInterests = DISCOVERY_CATEGORIES.filter((category) =>
        interests.has(category.id)
      ).map((category) => category.id);
      const signupGate = await assertSignupAllowed();
      if (!signupGate.ok) {
        throw new Error(signupGate.error);
      }
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      if (next) callbackUrl.searchParams.set("next", next);

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          captchaToken: captchaToken ?? undefined,
          data: {
            role,
            display_name: displayName.trim(),
            date_of_birth: role === "student" ? dateOfBirth : null,
            age_band: ageBand,
            state: state || null,
            zip: zip || null,
            interests: selectedInterests,
            preferred_competition_category: null,
          },
        },
      });

      if (signError) throw signError;

      // Email confirmation required — no session until they click the link.
      // An already-registered address looks the same except identities is empty
      // and no mail is sent.
      if (!data.session) {
        if (isExistingAccountSignup(data.user)) {
          setAlreadyRegistered(true);
          return;
        }
        setNeedsConfirm(true);
        return;
      }

      router.push(next ?? homePathForRole(role));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (SAFE_SIGNUP_ERRORS.has(message)) {
        setError(message);
      } else if (isAlreadyRegisteredAuthError(message)) {
        setAlreadyRegistered(true);
      } else {
        console.error("Sign-up failed:", err);
        setError("Could not create the account. Check your connection and try again.");
      }
    } finally {
      setPending(false);
      setCaptchaToken(null);
      setCaptchaVersion((current) => current + 1);
    }
  }

  if (alreadyRegistered) {
    return (
      <div
        className="rounded-xl border border-brand-red/25 bg-accent-soft p-6"
        role="status"
      >
        <h2 className="font-display text-display-sm font-bold text-foreground">
          {EXISTING_ACCOUNT_HEADING}
        </h2>
        <p className="mt-3 text-sm text-muted">
          Sign in with{" "}
          <strong className="text-foreground">{email.trim()}</strong>. Each
          email can only have one account.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={loginHref} className="cta-enabled inline-flex">
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => {
              setAlreadyRegistered(false);
              setPassword("");
              setConfirmPassword("");
            }}
            className="action-button"
          >
            Use a different email
          </button>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-muted-strong hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    );
  }

  if (needsConfirm) {
    const finishStep = joiningOrganization
      ? {
          title: "Review the organization",
          copy: "You’ll review it before joining its roster.",
        }
      : invitation
        ? {
            title: "Accept your invitation",
            copy: `${invitation.roleLabel} at ${invitation.orgName}.`,
          }
        : next
          ? { title: "Continue where you left off", copy: null }
          : roleCopy.confirmationStep;

    return (
      <div role="status" className="animate-rise">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red text-white"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path
                d="M5 10.5l3.5 3.5L15 6.5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="font-display text-display-sm font-bold text-foreground">
            Confirm your email to finish
          </h2>
        </div>

        {/* §8.11 path rail, same motif as PathwayList: filled nodes for
            done/current, hollow for what is still ahead. */}
        <ol className="mt-6 flex flex-col gap-5 border-l-2 border-brand-red pl-0">
          <li className="relative pl-6">
            <span
              aria-hidden="true"
              className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-red bg-brand-red"
            />
            <p className="text-base font-semibold text-foreground">
              Account created
            </p>
            <p className="mt-0.5 text-sm text-muted">
              We sent a confirmation link to{" "}
              <strong className="text-foreground">{email}</strong>.
            </p>
          </li>
          <li className="relative pl-6">
            <span
              aria-hidden="true"
              className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-red bg-brand-red ring-4 ring-accent-soft"
            />
            <p className="text-base font-semibold text-foreground">
              Open the email on this device
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Tap the confirmation link inside. School inboxes often send it to
              junk — check spam before creating a second account.
            </p>
          </li>
          <li className="relative pl-6">
            <span
              aria-hidden="true"
              className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-red bg-surface"
            />
            <p className="text-base font-semibold text-foreground">
              {finishStep.title}
            </p>
            {finishStep.copy ? (
              <p className="mt-0.5 text-sm text-muted">{finishStep.copy}</p>
            ) : null}
          </li>
        </ol>

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-xs font-semibold text-muted-strong">
            Didn’t get the email?
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <AuthCaptcha
              key={captchaVersion}
              onTokenChange={setCaptchaToken}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={
                  resendState === "pending" ||
                  resendState === "sent" ||
                  (AUTH_CAPTCHA_ENABLED && !captchaToken)
                }
                onClick={async () => {
                  if (AUTH_CAPTCHA_ENABLED && !captchaToken) return;
                  setResendState("pending");
                  try {
                    const supabase = createBrowserSupabaseClient();
                    const callbackUrl = new URL(
                      "/auth/callback",
                      window.location.origin
                    );
                    if (next) callbackUrl.searchParams.set("next", next);
                    const { error: resendError } = await supabase.auth.resend({
                      type: "signup",
                      email: email.trim(),
                      options: {
                        emailRedirectTo: callbackUrl.toString(),
                        captchaToken: captchaToken ?? undefined,
                      },
                    });
                    setResendState(resendError ? "error" : "sent");
                  } catch {
                    setResendState("error");
                  } finally {
                    setCaptchaToken(null);
                    setCaptchaVersion((current) => current + 1);
                  }
                }}
                className="cta-outline disabled:opacity-60"
              >
                {resendState === "pending"
                  ? "Sending…"
                  : resendState === "sent"
                    ? "Confirmation resent"
                    : "Resend confirmation"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNeedsConfirm(false);
                  setResendState("idle");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="action-button"
              >
                Use a different email
              </button>
              <Link
                href={loginHref}
                className="group text-sm font-semibold text-muted-strong hover:text-brand-red"
              >
                Already confirmed? Sign in{" "}
                <span aria-hidden="true" className="nudge-x">
                  →
                </span>
              </Link>
            </div>
          </div>
          {resendState === "error" ? (
            <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
              Could not resend. Wait a minute and try again, or sign in if the
              account already exists.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {joiningOrganization ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-strong">Account type</p>
          <p className="text-sm font-semibold text-foreground">Student</p>
          <p className="text-xs text-muted">
            Organization join links add students to a school or club roster.
          </p>
        </div>
      ) : invitation ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-strong">
            Account type
          </p>
          <p className="text-sm font-semibold text-foreground">
            {invitation.accountRole === "student" ? "Student" : "Staff"}
          </p>
          <p className="text-xs text-muted">
            After email confirmation, accept the {invitation.roleLabel.toLowerCase()}{" "}
            role in {invitation.orgName}.
          </p>
        </div>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-semibold text-muted-strong">Account type</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const selected = role === opt.value;
              const shortLabel =
                opt.value === "coach" ? "Coach" : opt.label;
              return (
                <label
                  key={opt.value}
                  className={`flex min-h-11 cursor-pointer touch-manipulation items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors focus-within:ring-2 focus-within:ring-accent/20 ${
                    selected
                      ? "border-brand-red/40 bg-accent-soft"
                      : "border-line bg-white hover:border-brand-red/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setRole(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-bold text-foreground">
                    {shortLabel}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted">{roleOption.description}</p>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-strong">
            {roleCopy.nameLabel}
          </span>
          <input
            className="field"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
          <span className="text-2xs text-muted">
            {invitation && invitation.accountRole === "coach"
              ? `Use the name ${invitation.orgName} staff will recognize.`
              : roleCopy.nameHelp}
          </span>
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
        <div className="sm:col-span-2">
          <PasswordField
            label="Password"
            required
            minLength={8}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
          />
        </div>
        <div className="sm:col-span-2">
          <PasswordField
            label="Confirm password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

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
            <span className="text-2xs text-muted">
              A parent or guardian should help students under 13 complete this
              form.
            </span>
          </label>
        ) : null}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-state"
            className="text-xs font-semibold text-muted-strong"
          >
            State
          </label>
          <select
            id="signup-state"
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
          <UseLocationControl
            id="signup-location"
            onLocated={({ zip: locatedZip, state: locatedState }) => {
              setZip(locatedZip);
              if (locatedState) setState(locatedState);
            }}
          />
        </div>
        <ZipCaptureField
          id="signup-zip"
          value={zip}
          onChange={setZip}
          helper="Nearby search uses this zip. Optional — you can add it after you confirm email."
          showLocationControl={false}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-muted-strong">
          Competition interests (optional)
        </legend>
        <p className="text-2xs text-muted">
          Choose any you follow. You can change these later in Account
          settings.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DISCOVERY_CATEGORIES.map((category) => {
            const selected = interests.has(category.id);
            return (
              <label
                key={category.id}
                className={`flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "border-brand-red/40 bg-accent-soft text-foreground"
                    : "border-line bg-white text-foreground hover:border-brand-red/30"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={(e) =>
                    setInterests((current) => {
                      const next = new Set(current);
                      if (e.target.checked) {
                        next.add(category.id);
                      } else {
                        next.delete(category.id);
                      }
                      return next;
                    })
                  }
                />
                <CategoryGlyph
                  category={category.id}
                  className={`h-5 w-5 shrink-0 ${
                    selected ? "text-brand-red" : "text-muted-strong"
                  }`}
                />
                <span className="font-semibold leading-tight">
                  {category.shortLabel}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <AuthCaptcha
        key={captchaVersion}
        onTokenChange={setCaptchaToken}
      />

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="cta-enabled disabled:opacity-60">
        {pending
          ? "Creating account…"
          : invitation?.accountRole === "coach"
            ? "Create staff account"
            : `Create ${roleOption.accountLabel} account`}
      </button>

      <p className="text-xs text-muted">
        By creating an account, you agree to the{" "}
        <Link
          href="/terms"
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          Terms of use
        </Link>{" "}
        and acknowledge how Causey handles account and student information in{" "}
        <Link
          href="/privacy"
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          Privacy and student data
        </Link>
        .
      </p>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-brand-red hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
