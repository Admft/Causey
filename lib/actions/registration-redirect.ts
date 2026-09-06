import { safeExternalUrl } from "@/lib/safe-url";

/**
 * The organizer link we are willing to hand a family. Same guard the rest of
 * the app renders links through, named for the one flow that redirects to it.
 */
export function safeOrganizerRegistrationUrl(raw: string): string | null {
  return safeExternalUrl(raw);
}
