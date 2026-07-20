import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
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
    <AuthShell
      title="Welcome back"
      subtitle="Log in with your email."
      footer={
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
          New to Vida?{" "}
          <Text style={{ color: tokens["--vida-primary"], fontWeight: "700" }} onPress={() => router.push("/signup")}>
            Create account
          </Text>
        </Text>
      }
    >
      <VInput label="Email Address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <VInput label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
      {error ? <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>{error}</Text> : null}
      <VButton title="Log in →" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}
