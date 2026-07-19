export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PinSetRequest {
  pin: string;
}

export interface PinVerifyRequest {
  email: string;
  pin: string;
}

export interface UserPublic {
  id: string;
  email: string;
  display_name: string | null;
  coin_balance: number;
  vip_until: string | null;
  theme_preference: string;
  is_creator: boolean;
}
