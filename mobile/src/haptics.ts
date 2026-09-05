import * as Haptics from "expo-haptics";

const TYPES = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

/**
 * Fire-and-forget. A device with no taptic engine rejects, and a failed buzz
 * must never surface as an error on top of the action that actually worked.
 */
export function feedback(type: keyof typeof TYPES): void {
  Haptics.notificationAsync(TYPES[type]).catch(() => {});
}
