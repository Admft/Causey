import type { AgeBand } from "@/lib/auth/types";
import { AGE_BAND_OPTIONS } from "@/lib/auth/types";

/** Whole years completed as of `asOf` (default today, local calendar). */
export function ageFromDateOfBirth(
  dateOfBirth: string | Date,
  asOf: Date = new Date()
): number {
  const dob =
    typeof dateOfBirth === "string"
      ? parseDateOnly(dateOfBirth)
      : dateOfBirth;
  if (!dob || Number.isNaN(dob.getTime())) {
    throw new Error("Enter a valid date of birth.");
  }
  if (dob > asOf) {
    throw new Error("Date of birth can’t be in the future.");
  }

  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function ageBandFromDateOfBirth(
  dateOfBirth: string | Date,
  asOf: Date = new Date()
): AgeBand {
  const age = ageFromDateOfBirth(dateOfBirth, asOf);
  if (age < 10) return "u10";
  if (age < 12) return "u12";
  if (age < 14) return "u14";
  if (age < 18) return "u18";
  return "18plus";
}

export function ageBandLabel(band: AgeBand): string {
  return AGE_BAND_OPTIONS.find((o) => o.value === band)?.label ?? band;
}
