import { useAuthStore } from "./useAuthStore";

/** Convenience hook exposing auth state + actions to components. */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    verifyOtp,
    login,
    verifyPin,
    logout,
    loadUser,
  } = useAuthStore();
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signUp,
    verifyOtp,
    login,
    verifyPin,
    logout,
    loadUser,
  };
}
