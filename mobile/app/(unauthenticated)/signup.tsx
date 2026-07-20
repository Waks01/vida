import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
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
    <AuthShell
      step="STEP 1 OF 2"
      title="Create your account"
      subtitle="Sign up with your email."
      footer={
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
          Already have an account?{" "}
          <Text style={{ color: tokens["--vida-primary"], fontWeight: "700" }} onPress={() => router.push("/login")}>
            Log in
          </Text>
        </Text>
      }
    >
      <VInput label="Email Address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <VInput label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
      {error ? <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>{error}</Text> : null}
      <VButton title="Continue →" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 8 }} />
      <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, textAlign: "center" }}>
        By continuing you agree to Terms & Privacy
      </Text>
      {devOtp ? <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12, textAlign: "center" }}>Dev OTP: {devOtp}</Text> : null}
    </AuthShell>
  );
}
