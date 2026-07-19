import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function Login() {
  const { tokens } = useTheme();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit() {
    await login(email, password);
    router.replace("/(authenticated)/(tabs)");
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 24, justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 26, fontWeight: "800", marginBottom: 24 }}>
        Welcome back
      </Text>
      <VInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <VInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={{ color: "#ef4444", marginBottom: 8 }}>{error}</Text> : null}
      <VButton title="Log in" loading={isLoading} fullWidth onPress={onSubmit} />
    </View>
  );
}
