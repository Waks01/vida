import { createMMKV } from "react-native-mmkv";

/** MMKV instance for non-sensitive prefs (theme, onboarding, last seen). */
export const storage = createMMKV({
  id: "vida-app",
  // Android: keep plaintext in dev; production should encrypt (see docs).
});

export const StorageKeys = {
  theme: "theme_preference",
  onboarded: "onboarded",
  lastFeedCursor: "last_feed_cursor",
} as const;

export function getStoredTheme(): string | undefined {
  return storage.getString(StorageKeys.theme);
}

export function setStoredTheme(theme: string): void {
  storage.set(StorageKeys.theme, theme);
}
