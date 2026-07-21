import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";

import { Providers } from "../src/providers/Providers";

export default function RootLayout() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#ff2d95" />
      </View>
    );
  }

  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(unauthenticated)" />
        <Stack.Screen name="(authenticated)" />
      </Stack>
    </Providers>
  );
}
