import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { storage } from "../../../core/storage/mmkv";
import { secureStore } from "../../../core/storage/secureStore";

import { authApi } from "../api/authApi";
import type { UserPublic } from "../types";

interface AuthState {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  signUp: (email: string, password: string) => Promise<string | undefined>; // returns dev OTP in Phase 0
  verifyOtp: (email: string, code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  verifyPin: (email: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      async signUp(email, password) {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.signUp({ email, password });
          return res.dev_otp;
        } catch (e) {
          set({ error: (e as Error).message });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      async verifyOtp(email, code) {
        const tokens = await authApi.verifyOtp({ email, code });
        await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
        await get().loadUser();
        set({ isAuthenticated: true });
      },

      async login(email, password) {
        const tokens = await authApi.login({ email, password });
        await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
        await get().loadUser();
        set({ isAuthenticated: true });
      },

      async verifyPin(email, pin) {
        const tokens = await authApi.verifyPin({ email, pin });
        await secureStore.setTokens(tokens.access_token, tokens.refresh_token);
        await get().loadUser();
        set({ isAuthenticated: true });
      },

      async logout() {
        await secureStore.clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      async loadUser() {
        const token = await secureStore.getAccessToken();
        if (!token) return;
        try {
          const user = await authApi.me(token);
          set({ user, isAuthenticated: true });
        } catch {
          await secureStore.clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "vida-auth",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => storage.getString(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.remove(key),
      })),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
