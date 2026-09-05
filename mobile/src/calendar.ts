import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

/** `message` is empty when the user simply dismissed the system sheet. */
export type CalendarOutcome = { ok: boolean; message: string };

const NO_PERMISSION =
  "Causey needs calendar access to add this tournament. Turn it on for Causey in Settings, then try again.";
const NO_CALENDAR = "No editable calendar was found on this device.";
const FAILED = "Could not add this tournament to your calendar.";

function localDay(iso: string, endOfDay = false): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 0, 0)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

async function writableCalendar(): Promise<Calendar.ExpoCalendar | null> {
  if (Platform.OS === "ios") {
    try {
      const preferred = Calendar.getDefaultCalendarSync();
      if (preferred?.allowsModifications) return preferred;
    } catch {
      // Fall through to the full list below.
    }
  }
  const all = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return all.find((entry) => entry.allowsModifications) ?? null;
}

/**
 * Permission is only ever requested from an explicit "Add to calendar" tap, and
 * the OS event sheet does the actual saving so nothing is written silently.
 */
export async function addTournamentToCalendar(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  notes: string | null;
}): Promise<CalendarOutcome> {
  try {
    const permission = await Calendar.requestCalendarPermissions();
    if (!permission.granted) return { ok: false, message: NO_PERMISSION };

    const calendar = await writableCalendar();
    if (!calendar) return { ok: false, message: NO_CALENDAR };

    const details = {
      title: input.title,
      startDate: localDay(input.startDate),
      endDate: localDay(input.endDate ?? input.startDate, true),
      allDay: true,
      location: input.location ?? undefined,
      notes: input.notes ?? undefined,
    };

    const result = await calendar.addEventWithForm(details);
    if (result.action === "canceled") return { ok: true, message: "" };
    if (result.action === "saved") {
      return { ok: true, message: "Added to your calendar." };
    }
    return { ok: true, message: "Saved to your calendar app." };
  } catch {
    return { ok: false, message: FAILED };
  }
}
