import { useState } from "react";
import { View, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VPinField } from "../../src/shared/components/VPinField";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function VerifyOtp() {
  const { tokens } = useTheme();
  const { verifyOtp, isLoading, error } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");

  async function onSubmit() {
    if (!email) return;
    await verifyOtp(email, code);
    router.replace("/(authenticated)/(tabs)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 24, justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
        Verify email
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 24 }}>
        Enter the 6-digit code sent to {email}
      </Text>
      <VPinField length={6} secure={false} onComplete={setCode} />
      {error ? <Text style={{ color: "#ef4444", marginTop: 12 }}>{error}</Text> : null}
      <VButton title="Verify" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 24 }} />
    </View>
  );
}
