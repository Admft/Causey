import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Last-good payload cache. The Family tab reads this first so the app opens
 * with real content instead of a spinner when the network is slow or gone.
 */
const PREFIX = "causey.cache.v1.";

export type Cached<T> = { value: T; savedAt: number };

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREFIX + key,
      JSON.stringify({ value, savedAt: Date.now() } satisfies Cached<T>)
    );
  } catch {
    // A full disk should never break the screen that just loaded fine.
  }
}

/** Called on sign-out so the next account never sees the previous family. */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((key) => key.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // Ignore — sign-out must still complete.
  }
}

export function formatSavedAt(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}
