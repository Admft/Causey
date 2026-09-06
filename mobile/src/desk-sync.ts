import type { EntrantTap } from "./entrant-decision";
import type { EntrantRowData } from "./entrant-row-data";

/** A Going / Can't go / Clear on the event screen must reach Family and Plan. */
export type DeskRsvpChange = {
  competition_id: string;
  profile_id: string;
  decision: EntrantTap;
  competition: EntrantRowData["competition"];
};

type Listener = (change?: DeskRsvpChange) => void;

const listeners = new Set<Listener>();

export function notifyDeskChanged(change?: DeskRsvpChange) {
  for (const listener of listeners) listener(change);
}

export function onDeskChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function deskChangeRow(change: DeskRsvpChange): EntrantRowData {
  return {
    competition_id: change.competition_id,
    profile_id: change.profile_id,
    status: "going",
    needs_organizer_registration: false,
    competition: change.competition,
  };
}
