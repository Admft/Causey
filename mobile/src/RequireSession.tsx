import { Redirect } from "expo-router";
import { Fragment, type ReactNode } from "react";
import { useAuth } from "./auth";
import { AccountError } from "./RoleHomeGuard";
import { Spinner } from "./ui";

/**
 * Coach stack screens and other signed-in work.
 *
 * Every branch here has to end somewhere a person can act: sign in, the
 * blocked explanation, a retry, or the screen itself. A spinner that waits on
 * a request that already failed is the one outcome this must not produce.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { ready, session, access, error } = useAuth();
  if (!ready) return <Spinner />;
  if (!session) return <Redirect href="/login" />;
  if (access && !access.allowed) return <Redirect href="/blocked" />;
  if (!access) {
    return error ? <AccountError message={error} /> : <Spinner />;
  }
  // Keying on the account remounts the screen when a different person signs
  // in on the same phone, so a roster or an alert list held in component
  // state cannot outlive the account it belongs to.
  return <Fragment key={session.user.id}>{children}</Fragment>;
}
