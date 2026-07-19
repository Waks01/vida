import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { env } from "../../core/config/env";
import { secureStore } from "../../core/storage/secureStore";

/**
 * Global HTTP client. Injects the bearer token, refreshes on 401, and routes
 * all requests through the FastAPI v1 prefix. Business features wrap this in
 * feature slash api slash. See docs/architecture/structure.md (core/ is infra-only).
 */
const client: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl + "/api/v1",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await secureStore.getRefreshToken();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, {
      refresh_token: refresh,
    });
    const access = data?.access_token as string | undefined;
    const newRefresh = data?.refresh_token as string | undefined;
    if (access) {
      await secureStore.setTokens(access, newRefresh || refresh);
      return access;
    }
    return null;
  } catch {
    await secureStore.clearTokens();
    return null;
  }
}

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return client(original);
      }
    }
    return Promise.reject(error);
  }
);

export { client as httpClient };
