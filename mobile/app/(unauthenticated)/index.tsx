import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";

import { useTheme } from "../../src/providers/ThemeProvider";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { storage, StorageKeys } from "../../src/core/storage/mmkv";
import { VidaLogo } from "../../src/shared/components/VidaLogo";

/** Branded splash — first screen on app open (per docs/vida-design.html §4).
 *  After ~1.6s: authed → home; new → onboarding; returning unauth → signup. */
export default function Splash() {
  const { tokens } = useTheme();
  const { isAuthenticated } = useAuth();
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => {
      const onboarded = storage.getBoolean(StorageKeys.onboarded) ?? false;

      if (authRef.current) {
        router.replace("/(authenticated)/(tabs)");
      } else if (!onboarded) {
        storage.set(StorageKeys.onboarded, true);
        router.replace("/(unauthenticated)/onboarding");
      } else {
        router.replace("/(unauthenticated)/signup");
      }
    }, 1600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        backgroundColor: tokens["--vida-bg"],
      }}
    >
      <VidaLogo size={92} />

      <Text
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: -0.5,
          marginTop: 16,
          color: tokens["--vida-text-primary"],
        }}
      >
        Vida
      </Text>

      <Text
        style={{
          fontSize: 11,
          color: tokens["--vida-text-muted"],
          marginTop: 6,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Every Minute. Every Drama. Earned.
      </Text>

      <ActivityIndicator
        style={{ marginTop: 32 }}
        size="large"
        color={tokens["--vida-primary"]}
      />
    </View>
  );
}
