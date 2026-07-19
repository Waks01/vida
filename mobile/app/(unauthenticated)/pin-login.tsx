import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VPinField } from "../../src/shared/components/VPinField";
import { VInput } from "../../src/shared/components/VInput";
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
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 24, justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
        PIN login
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 20 }}>
        Enter your email + 4–6 digit PIN
      </Text>
      <VInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <VPinField length={6} onComplete={setPin} />
      {error ? <Text style={{ color: "#ef4444", marginTop: 12 }}>{error}</Text> : null}
      <VButton title="Unlock" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 24 }} />
    </View>
  );
}
