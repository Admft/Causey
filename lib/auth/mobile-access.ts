import { ageFromDateOfBirth } from "@/lib/auth/age-band";

export type MobileAccessDeniedCode = "under_13" | "student_dob_required";

export type MobileAppAccess =
  | { allowed: true }
  | { allowed: false; code: MobileAccessDeniedCode; message: string };

const UNDER_13_MESSAGE =
  "The Causey app is for ages 13 and up. A parent or guardian should use a parent account on this phone.";

const DOB_REQUIRED_MESSAGE =
  "Student accounts need a date of birth. Open Causey in a browser to add it, or use a parent account.";

/**
 * Store-safe gate for the iOS/Android app. Parents and coaches may sign in.
 * Students under 13, or students with no date of birth, cannot use the app.
 * This is not a COPPA consent program.
 */
export function mobileAppAccess(profile: {
  role: string;
  date_of_birth: string | null;
}): MobileAppAccess {
  if (profile.role !== "student") return { allowed: true };
  if (!profile.date_of_birth) {
    return {
      allowed: false,
      code: "student_dob_required",
      message: DOB_REQUIRED_MESSAGE,
    };
  }
  try {
    if (ageFromDateOfBirth(profile.date_of_birth) < 13) {
      return {
        allowed: false,
        code: "under_13",
        message: UNDER_13_MESSAGE,
      };
    }
  } catch {
    return {
      allowed: false,
      code: "student_dob_required",
      message: DOB_REQUIRED_MESSAGE,
    };
  }
  return { allowed: true };
}
