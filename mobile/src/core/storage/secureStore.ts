import * as SecureStore from "expo-secure-store";

/**
 * Secure token storage. Holds access + refresh JWTs and the user's PIN
 * reference (never the raw PIN — only a local biometric/PIN gate flag).
 * See docs/agent/spec.md: secrets MUST live here, never in MMKV or logs.
 */
const KEYS = {
  accessToken: "auth.access_token",
  refreshToken: "auth.refresh_token",
  pinSet: "auth.pin_set",
} as const;

export const secureStore = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.accessToken);
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.accessToken, access);
    await SecureStore.setItemAsync(KEYS.refreshToken, refresh);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.refreshToken);
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.accessToken);
    await SecureStore.deleteItemAsync(KEYS.refreshToken);
  },
  async isPinSet(): Promise<boolean> {
    return (await SecureStore.getItemAsync(KEYS.pinSet)) === "true";
  },
  async setPinSet(value: boolean): Promise<void> {
    await SecureStore.setItemAsync(KEYS.pinSet, value ? "true" : "false");
  },
};
