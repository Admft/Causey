export type RegistrationMark = "opened" | "registered" | "not_registered";
export type RsvpMark = "going" | "not_going";

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

/** Same idea for Going / Can't go when the attendance reload is missing. */
export function resolveRsvpStatus<T extends string>(input: {
  serverStatus: T;
  localStatus?: RsvpMark | null;
}): T | RsvpMark {
  return input.localStatus ?? input.serverStatus;
}
