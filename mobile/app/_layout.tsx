import { Stack } from "expo-router";

import { Providers } from "../src/providers/Providers";

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(unauthenticated)" />
        <Stack.Screen name="(authenticated)" />
      </Stack>
    </Providers>
  );
}
