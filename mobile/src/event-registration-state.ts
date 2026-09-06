export type RegistrationMark = "opened" | "registered" | "not_registered";

/**
 * Local marks win so “Yes, registration is complete” can update the screen
 * even when the follow-up GET is missing or still returning “opened”.
 */
export function resolveRegistrationStatus(input: {
  serverStatus: RegistrationMark | null;
  localStatus?: RegistrationMark | null;
  openedLocally: boolean;
}): RegistrationMark | null {
  if (input.localStatus) return input.localStatus;
  if (input.serverStatus) return input.serverStatus;
  if (input.openedLocally) return "opened";
  return null;
}
