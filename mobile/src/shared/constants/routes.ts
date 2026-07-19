/** Centralized route paths (Expo Router). Keep in sync with app/ tree. */
export const Routes = {
  splash: "/",
  signup: "/signup",
  verifyOtp: "/verify-otp",
  login: "/login",
  pinLogin: "/pin-login",
  home: "/(tabs)",
  search: "/(tabs)/search",
  wallet: "/(tabs)/wallet",
  profile: "/(tabs)/profile",
  seriesDetail: (id: string) => `/series/${id}`,
  player: "/player",
  settings: "/settings",
  pinSetup: "/pin-setup",
  creatorApply: "/creator/apply",
} as const;
