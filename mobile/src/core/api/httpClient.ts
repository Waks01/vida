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
  async (error) => {
    const axiosError = error as {
      code?: string;
      response?: { status?: number; data?: { detail?: string; message?: string } };
      config?: InternalAxiosRequestConfig & { _retry?: boolean };
    };

    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ERR_NETWORK" || !axiosError.response) {
      return Promise.reject(new Error("Network error. Check your connection and try again."));
    }

    if (axiosError.response.status === 401 && axiosError.config && !axiosError.config._retry) {
      axiosError.config._retry = true;
      if (!refreshing) {
        refreshing = refreshAccessToken();
      }
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        axiosError.config.headers.set("Authorization", `Bearer ${newToken}`);
        return client(axiosError.config);
      }
    }

    if (axiosError.response.data && axiosError.response.data.detail) {
      return Promise.reject(new Error(axiosError.response.data.detail as string));
    }
    if (axiosError.response.data && axiosError.response.data.message) {
      return Promise.reject(new Error(axiosError.response.data.message as string));
    }
    return Promise.reject(error);
  }
);

export { client as httpClient };
