import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import { homeRouteForRole, type HomeRoute } from "./roles";
import {
  ErrorText,
  Kicker,
  Lede,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Spinner,
  Title,
} from "./ui";

type Resolution =
  | { kind: "wait" }
  | { kind: "anonymous" }
  | { kind: "blocked" }
  | { kind: "error"; message: string }
  | { kind: "home"; home: HomeRoute };

/**
 * Which tab this account belongs to, or why we cannot say yet.
 *
 * The session arrives before the profile does on a fresh sign-in, so anything
 * that reads `role` too early sees `undefined` and falls back to the parent
 * home. Waiting here is what keeps a student or coach off the Family tab.
 */
function useAccountHome(): Resolution {
  const { ready, session, profile, access, error } = useAuth();

  if (!ready) return { kind: "wait" };
  if (!session) return { kind: "anonymous" };
  if (access && access.allowed === false) return { kind: "blocked" };
  if (!profile) {
    return error ? { kind: "error", message: error } : { kind: "wait" };
  }
  return { kind: "home", home: homeRouteForRole(profile.role) };
}

/**
 * Shown when the sign-in worked but `/api/mobile/me` did not. Every screen
 * that waits on account details needs this escape hatch; a bare spinner would
 * never resolve.
 */
export function AccountError({ message }: { message: string }) {
  const { refreshMe, signOut } = useAuth();
  return (
    <Screen>
      <Kicker>Causey</Kicker>
      <Title>We could not load your account</Title>
      <Lede>
        Your sign-in worked, but Causey could not read your account details.
      </Lede>
      <ErrorText>{message}</ErrorText>
      <PrimaryButton label="Try again" onPress={() => void refreshMe()} />
      <SecondaryButton label="Sign out" onPress={() => void signOut()} />
    </Screen>
  );
}

/**
 * Entry point. A signed-in account goes to the tab that belongs to it; a
 * visitor with no account goes to tournament search rather than a login wall.
 */
export function AccountHomeRedirect() {
  const resolution = useAccountHome();

  if (resolution.kind === "wait") return <Spinner />;
  if (resolution.kind === "anonymous") return <Redirect href="/search" />;
  if (resolution.kind === "blocked") return <Redirect href="/blocked" />;
  if (resolution.kind === "error") {
    return <AccountError message={resolution.message} />;
  }
  return <Redirect href={resolution.home} />;
}

/**
 * Wraps a role's home tab. Hiding a tab button with `href: null` does not stop
 * the navigator from resolving that route, so each home also refuses to render
 * for a role it does not belong to. Opening a role home without an account is
 * a request to sign in, so that case goes to login rather than to search.
 */
export function RoleHomeGuard({
  home,
  children,
}: {
  home: HomeRoute;
  children: ReactNode;
}) {
  const resolution = useAccountHome();

  if (resolution.kind === "wait") return <Spinner />;
  if (resolution.kind === "anonymous") return <Redirect href="/login" />;
  if (resolution.kind === "blocked") return <Redirect href="/blocked" />;
  if (resolution.kind === "error") {
    return <AccountError message={resolution.message} />;
  }
  if (resolution.home !== home) return <Redirect href={resolution.home} />;
  return <>{children}</>;
}
