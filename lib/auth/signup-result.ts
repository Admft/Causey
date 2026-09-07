/**
 * Supabase does not error when the email is already registered (user
 * enumeration). It returns a session-less user with an empty identities
 * list and sends no confirmation mail.
 */
export function isExistingAccountSignup(
  user: { identities?: unknown[] | null } | null | undefined
): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}
