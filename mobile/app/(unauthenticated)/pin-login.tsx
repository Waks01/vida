import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { VPinField } from "../../src/shared/components/VPinField";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function PinLogin() {
  const { tokens } = useTheme();
  const { verifyPin, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  async function onSubmit() {
    await verifyPin(email, pin);
    router.replace("/(authenticated)/(tabs)");
  }

  return (
    <AuthShell
      icon="lock-closed"
      title="PIN login"
      subtitle="Enter your email + 4–6 digit PIN"
      footer={
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
          Forgot?{" "}
          <Text style={{ color: tokens["--vida-primary"], fontWeight: "700" }} onPress={() => router.push("/login")}>
            Email login
          </Text>
        </Text>
      }
    >
      <VInput label="Email Address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <VPinField length={6} onComplete={setPin} />
      {error ? <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>{error}</Text> : null}
      <VButton title="Unlock →" loading={isLoading} fullWidth onPress={onSubmit} disabled={pin.length < 4} />
    </AuthShell>
  );
}
