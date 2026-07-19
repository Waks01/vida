import Constants from "expo-constants";

/**
 * Typed access to EXPO_PUBLIC_* env vars. Never put secrets here — tokens live
 * in SecureStore (core/storage/secureStore.ts). See docs/steering/conventions.md.
 */
interface AppEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  amplitudeKey: string;
  sentryDsn: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppEnv>;

export const env: AppEnv = {
  // Default to local FastAPI backend (see backend/docker-compose.yml).
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "http://10.0.2.2:8000",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "",
  amplitudeKey: process.env.EXPO_PUBLIC_AMPLITUDE_KEY ?? extra.amplitudeKey ?? "",
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? extra.sentryDsn ?? "",
};

export const API_V1 = "/api/v1";
