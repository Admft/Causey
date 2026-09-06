import * as Linking from "expo-linking";
import { Share } from "react-native";

/** System browser or share sheet. Never throws — a failed open is a string. */
export async function openExternalUrl(url: string): Promise<string | null> {
  try {
    await Linking.openURL(url);
    return null;
  } catch {
    return "Could not open that link.";
  }
}

/**
 * Organizer links arrive from scraped listings, so treat them as untrusted:
 * only http(s) reaches the system browser.
 */
export function safeRegUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function sharePlainText(input: {
  title: string;
  message: string;
  url?: string;
}): Promise<string | null> {
  try {
    await Share.share({
      title: input.title,
      message: input.message,
      url: input.url,
    });
    return null;
  } catch {
    return "Could not open the share sheet.";
  }
}
