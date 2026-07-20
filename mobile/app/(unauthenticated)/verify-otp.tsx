import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
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
    <AuthShell
      icon="mail"
      title="Verify your email"
      subtitle={`Enter the 6-digit code sent to ${email ?? "your email"}`}
      footer={
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
          Didn't get it? <Text style={{ color: tokens["--vida-primary"], fontWeight: "700" }}>Resend code</Text>
        </Text>
      }
    >
      <VPinField length={6} secure={false} onComplete={setCode} />
      {error ? <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>{error}</Text> : null}
      <VButton title="Verify →" loading={isLoading} fullWidth onPress={onSubmit} />
    </AuthShell>
  );
}
