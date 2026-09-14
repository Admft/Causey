import "server-only";

import { todayIsoInTimeZone } from "@/lib/competition-timing";
import { getNotificationPreferences } from "@/lib/data/district";

export const PRODUCT_TIME_ZONE = "America/Chicago";

export async function getViewerTodayIso(profileId: string): Promise<string> {
  const prefs = await getNotificationPreferences(profileId);
  return todayIsoInTimeZone(prefs?.timezone || PRODUCT_TIME_ZONE);
}
