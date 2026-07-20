import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/hooks/useAuth";

/** Guards the unauthenticated group: bounce to home if already logged in. */
export default function UnauthenticatedLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Redirect href="/(authenticated)/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="login" />
      <Stack.Screen name="pin-login" />
    </Stack>
  );
}
