import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function SignUp() {
  const { tokens } = useTheme();
  const { signUp, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();

  async function onSubmit() {
    const otp = await signUp(email, password);
    setDevOtp(otp);
    router.push({ pathname: "/verify-otp", params: { email } });
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: tokens["--vida-bg"], padding: 24, justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 26, fontWeight: "800", marginBottom: 24 }}>
        Create account
      </Text>
      <VInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@email.com" />
      <VInput label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="min 8 characters" />
      {error ? <Text style={{ color: "#ef4444", marginBottom: 8 }}>{error}</Text> : null}
      <VButton title="Send OTP" loading={isLoading} fullWidth onPress={onSubmit} />
      {devOtp ? <Text style={{ color: tokens["--vida-text-dim"], marginTop: 12, textAlign: "center" }}>Dev OTP: {devOtp}</Text> : null}
    </ScrollView>
  );
}
