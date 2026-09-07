import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { causeyFetch } from "./api";
import { clearCache } from "./cache";
import { supabase, supabaseConfigured } from "./supabase";
import { siteUrl } from "./theme";

export type PublicProfile = {
  id: string;
  role: string;
  display_name: string;
  zip: string | null;
  email: string | null;
};

export type MobileAccess =
  | { allowed: true }
  | { allowed: false; code: string; message: string };

/** The app never signs up students, so it never asks for a birth date. */
export type MobileSignupRole = "parent" | "coach";

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  role: MobileSignupRole;
  zip: string;
};

export type SignUpOutcome =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

const NOT_CONFIGURED =
  "This build is not connected to accounts yet. Reinstall the latest build or contact support.";

type AuthValue = {
  ready: boolean;
  session: Session | null;
  profile: PublicProfile | null;
  access: MobileAccess | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<SignUpOutcome>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  deleteAccount: (confirmationEmail: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [access, setAccess] = useState<MobileAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async (active: Session | null) => {
    if (!active?.access_token) {
      setProfile(null);
      setAccess(null);
      return;
    }
    const data = (await causeyFetch("/api/mobile/me", {
      token: active.access_token,
    })) as { profile: PublicProfile; access: MobileAccess };
    setProfile(data.profile);
    setAccess(data.access);
  }, []);

  // Accounts can change without a clean sign-out: a token expires, or a second
  // person signs in on a shared phone.
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session ?? null);
        refreshMe(data.session)
          .catch((err: Error) => setError(err.message))
          .finally(() => {
            if (!cancelled) setReady(true);
          });
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setProfile(null);
        setAccess(null);
        setReady(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextUserId = next?.user.id ?? null;
      if (lastUserId.current && lastUserId.current !== nextUserId) {
        // A different account, so the previous profile, access decision, and
        // cached payloads are wrong rather than stale. Clearing them in the
        // same commit as the session is what stops one render from pairing
        // account B's token with account A's name or blocked verdict.
        void clearCache();
        setProfile(null);
        setAccess(null);
        setError(null);
      }
      setSession(next);
      if (!next) {
        setProfile(null);
        setAccess(null);
        setReady(true);
        return;
      }
      refreshMe(next).catch((err: Error) => setError(err.message));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refreshMe]);

  useEffect(() => {
    lastUserId.current = session?.user.id ?? null;
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) return NOT_CONFIGURED;
    setError(null);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return signError?.message ?? null;
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpOutcome> => {
      if (!supabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            role: input.role,
            display_name: input.displayName.trim(),
            // Parents and coaches only — the app has no student sign-up, so no
            // birth date is ever collected on a phone.
            date_of_birth: null,
            age_band: null,
            state: null,
            zip: input.zip.trim() || null,
            interests: [],
            preferred_competition_category: null,
          },
        },
      });
      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (
          message.includes("already registered") ||
          message.includes("already been registered")
        ) {
          return {
            ok: false,
            error: "An account for that email already exists. Sign in.",
          };
        }
        return { ok: false, error: signUpError.message };
      }
      // Already-registered emails return a fake user with no identities and
      // send no confirmation mail.
      if (
        !data.session &&
        Array.isArray(data.user?.identities) &&
        data.user.identities.length === 0
      ) {
        return {
          ok: false,
          error: "An account for that email already exists. Sign in.",
        };
      }
      return { ok: true, needsEmailConfirmation: !data.session };
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabaseConfigured) return NOT_CONFIGURED;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` }
    );
    return resetError
      ? "Could not send the reset link. Check your connection and try again."
      : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await clearCache();
    setProfile(null);
    setAccess(null);
  }, []);

  const deleteAccount = useCallback(
    async (confirmationEmail: string) => {
      const token = session?.access_token;
      if (!token) return "Sign in again, then delete your account.";
      try {
        await causeyFetch("/api/mobile/account", {
          token,
          method: "DELETE",
          body: { confirmationEmail: confirmationEmail.trim() },
        });
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Could not delete the account. Try again.";
      }
      await signOut();
      return null;
    },
    [session, signOut]
  );

  const value = useMemo(
    () => ({
      ready,
      session,
      profile,
      access,
      error,
      signIn,
      signUp,
      sendPasswordReset,
      deleteAccount,
      signOut,
      refreshMe: () => refreshMe(session),
    }),
    [
      ready,
      session,
      profile,
      access,
      error,
      signIn,
      signUp,
      sendPasswordReset,
      deleteAccount,
      signOut,
      refreshMe,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
