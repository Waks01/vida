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
  lastCheckInDate: "last_check_in_date",
} as const;

export function getStoredTheme(): string | undefined {
  return storage.getString(StorageKeys.theme);
}

export function setStoredTheme(theme: string): void {
  storage.set(StorageKeys.theme, theme);
}

export function getLastCheckInDate(): string | undefined {
  return storage.getString(StorageKeys.lastCheckInDate);
}

export function setLastCheckInDate(date: string): void {
  storage.set(StorageKeys.lastCheckInDate, date);
}

export function hasCheckedInToday(): boolean {
  const lastDate = getLastCheckInDate();
  if (!lastDate) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return lastDate === todayStr;
}
