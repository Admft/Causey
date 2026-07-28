/**
 * Join-code helpers, mirroring generate_join_code() in
 * supabase/migrations/0011_org_access.sql. The alphabet drops vowels (no
 * accidental words) and 0/O/1/I/L lookalikes so codes survive being read
 * aloud in a classroom.
 */

export const JOIN_CODE_ALPHABET = "BCDFGHJKMNPQRSTVWXYZ23456789";
export const JOIN_CODE_LENGTH = 8;

/** Uppercase and strip separators so pasted "bcdf-ghjk" matches. */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidJoinCode(input: string): boolean {
  const code = normalizeJoinCode(input);
  if (code.length !== JOIN_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/** Display grouping: BCDFGHJK → BCDF-GHJK. */
export function formatJoinCode(code: string): string {
  const normalized = normalizeJoinCode(code);
  if (normalized.length !== JOIN_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}
