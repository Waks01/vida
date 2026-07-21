import { useState, useCallback } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";
import { validateEmail, validatePassword, sanitizeEmail, sanitizePassword, type ValidationErrors } from "../../src/features/auth/utils/validation";

export default function Login() {
  const { tokens } = useTheme();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setErrors((prev) => ({ ...prev, email: validateEmail(text) }));
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setErrors((prev) => ({ ...prev, password: validatePassword(text) }));
  }, []);

  async function onSubmit() {
    setApiError(null);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setErrors({ email: emailErr, password: passwordErr });
    if (emailErr || passwordErr) return;
    try {
      await login(sanitizeEmail(email), sanitizePassword(password));
      router.replace("/(authenticated)/(tabs)");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
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
      <VInput
        label="Email Address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={handleEmailChange}
        placeholder="you@example.com"
        error={errors.email}
      />
      <VInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={handlePasswordChange}
        placeholder="••••••••"
        error={errors.password}
      />
      {apiError && (
        <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>
          {apiError}
        </Text>
      )}
      <VButton title="Log in →" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}
