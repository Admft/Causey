/**
 * Supabase does not error when the email is already registered (user
 * enumeration). It returns a session-less user with an empty identities
 * list and sends no confirmation mail.
 */
export const EXISTING_ACCOUNT_HEADING =
  "An account for that email already exists";

export function isExistingAccountSignup(
  user: { identities?: unknown[] | null } | null | undefined
): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export function isAlreadyRegisteredAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered")
  );
}
