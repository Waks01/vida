import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/hooks/useAuth";

/** Auth guard: unauthenticated users fall back to signup. */
export default function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(unauthenticated)/signup" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="series/[id]" />
      {/* Player is a full-screen modal so the swipe-paging math
          matches the actual window height — the (tabs) tab bar
          stays mounted underneath otherwise, which makes the
          FlatList pages misalign by ~80px and the swipe never
          quite lands on the next episode. */}
      <Stack.Screen
        name="player"
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="pin-setup" />
      <Stack.Screen name="creator/apply" />
      <Stack.Screen name="creator/dashboard" />
      <Stack.Screen name="creator/earnings" />
      <Stack.Screen name="admin/pending" />
      <Stack.Screen name="admin/adjust-coins" />
    </Stack>
  );
}
