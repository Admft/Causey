import * as Calendar from "expo-calendar";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { apiUrl } from "./theme";

/** `message` is empty when the user simply dismissed the system sheet. */
export type CalendarOutcome = { ok: boolean; message: string };

const NO_PERMISSION =
  "Causey needs calendar access to add this tournament. Turn it on for Causey in Settings, then try again.";
const FAILED = "Could not add this tournament to your calendar.";
const OPENED_FILE =
  "Opened a calendar file. Add the tournament from your calendar app.";
const OPENED_GOOGLE = "Opened a calendar template you can save.";

function localDay(iso: string, endOfDay = false): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 0, 0)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function dateDigits(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function eventIcsUrl(apiOrigin: string, slug: string): string {
  const origin = apiOrigin.replace(/\/$/, "");
  return `${origin}/event/${encodeURIComponent(slug)}/ics`;
}

export function eventWebcalUrl(apiOrigin: string, slug: string): string {
  return eventIcsUrl(apiOrigin, slug)
    .replace(/^https:/, "webcal:")
    .replace(/^http:/, "webcal:");
}

export function googleCalendarTemplateUrl(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  details: string | null;
}): string {
  const start = dateDigits(input.startDate);
  const end = dateDigits(nextDay(input.endDate ?? input.startDate));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
  });
  if (input.location) params.set("location", input.location);
  if (input.details) params.set("details", input.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}&dates=${start}/${end}`;
}

/** Expo Go stubs expo-calendar; a development or store build has the native module. */
export function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === "expo";
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

async function tryNativeCalendar(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  notes: string | null;
}): Promise<CalendarOutcome | null> {
  if (isExpoGoRuntime()) return null;
  try {
    const permission = await Calendar.requestCalendarPermissions(true);
    if (!permission.granted) return { ok: false, message: NO_PERMISSION };

    const calendar = await writableCalendar();
    if (!calendar) return null;

    const result = await calendar.addEventWithForm({
      title: input.title,
      startDate: localDay(input.startDate),
      endDate: localDay(input.endDate ?? input.startDate, true),
      allDay: true,
      location: input.location ?? undefined,
      notes: input.notes ?? undefined,
    });
    if (result.action === "canceled") return { ok: true, message: "" };
    if (result.action === "saved") {
      return { ok: true, message: "Added to your calendar." };
    }
    return { ok: true, message: "Saved to your calendar app." };
  } catch {
    // Expo Go, missing calendars, and simulator accounts all land here.
    return null;
  }
}

async function openUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (can === false) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Permission is only ever requested from an explicit "Add to calendar" tap.
 * Expo Go has no native calendar module, so we open an .ics / Calendar template.
 */
export async function addTournamentToCalendar(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  notes: string | null;
  slug: string;
}): Promise<CalendarOutcome> {
  const native = await tryNativeCalendar(input);
  if (native?.ok) return native;

  const ics = eventIcsUrl(apiUrl, input.slug);
  const webcal = eventWebcalUrl(apiUrl, input.slug);
  if (await openUrl(webcal)) return { ok: true, message: OPENED_FILE };
  if (await openUrl(ics)) return { ok: true, message: OPENED_FILE };

  const google = googleCalendarTemplateUrl({
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location,
    details: input.notes,
  });
  if (await openUrl(google)) return { ok: true, message: OPENED_GOOGLE };

  if (native && !native.ok) return native;
  return { ok: false, message: FAILED };
}
