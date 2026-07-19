import { httpClient } from "../../../core/api/httpClient";

import type {
  LoginRequest,
  PinSetRequest,
  PinVerifyRequest,
  SignUpRequest,
  TokenResponse,
  UserPublic,
  VerifyOtpRequest,
} from "../types";

/**
 * Thin API wrappers for the auth endpoints. Each maps 1:1 to
 * backend/src/app/api/v1/endpoints/auth.py. No business logic here.
 */
export const authApi = {
  async signUp(body: SignUpRequest): Promise<{ dev_otp?: string }> {
    const { data } = await httpClient.post("/auth/signup", body);
    return data;
  },

  async verifyOtp(body: VerifyOtpRequest): Promise<TokenResponse> {
    const { data } = await httpClient.post("/auth/verify-otp", body);
    return data;
  },

  async login(body: LoginRequest): Promise<TokenResponse> {
    const { data } = await httpClient.post("/auth/login", body);
    return data;
  },

  async setPin(body: PinSetRequest, token: string): Promise<void> {
    await httpClient.post(
      "/auth/pin/set",
      body,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  async verifyPin(body: PinVerifyRequest): Promise<TokenResponse> {
    const { data } = await httpClient.post("/auth/pin/verify", body);
    return data;
  },

  async me(token: string): Promise<UserPublic> {
    const { data } = await httpClient.get("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },
};
