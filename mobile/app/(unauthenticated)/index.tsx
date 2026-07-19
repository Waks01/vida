import { useEffect } from "react";
import { View, Text, Image } from "react-native";
import { Redirect, router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { useTheme } from "../../src/providers/ThemeProvider";
import { storage, StorageKeys } from "../../src/core/storage/mmkv";

/** Splash → onboarding. Marks onboarding complete on first CTA. */
export default function Splash() {
  const { tokens } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => {
      storage.set(StorageKeys.onboarded, true);
      router.replace("/signup");
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // Briefly show splash, then route. (Kept simple for Phase 0.)
  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-primary"], fontSize: 34, fontWeight: "800" }}>Vida</Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginTop: 6 }}>Watch dramas. Earn coins.</Text>
    </View>
  );
}
