/**
 * Typable activation codes for staff invitations, mirroring
 * generate_activation_code() in supabase/migrations/0074.
 *
 * Same alphabet and length as a student join code so a code survives being
 * read aloud. The code is not access on its own: claiming still requires
 * controlling the invited email address.
 */

import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  formatJoinCode,
  normalizeJoinCode,
} from "@/lib/org-codes";

export const ACTIVATION_CODE_ALPHABET = JOIN_CODE_ALPHABET;
export const ACTIVATION_CODE_LENGTH = JOIN_CODE_LENGTH;

export function normalizeActivationCode(input: string): string {
  return normalizeJoinCode(input);
}

export function isValidActivationCode(input: string): boolean {
  const code = normalizeActivationCode(input);
  if (code.length !== ACTIVATION_CODE_LENGTH) return false;
  for (const character of code) {
    if (!ACTIVATION_CODE_ALPHABET.includes(character)) return false;
  }
  return true;
}

/** Display grouping: BCDFGHJK → BCDF-GHJK. */
export function formatActivationCode(code: string): string {
  return formatJoinCode(code);
}
