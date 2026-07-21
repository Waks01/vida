import { useState, useCallback } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { VPinField } from "../../src/shared/components/VPinField";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";
import { validateEmail, validatePin, sanitizeEmail, sanitizePin, type ValidationErrors } from "../../src/features/auth/utils/validation";

export default function PinLogin() {
  const { tokens } = useTheme();
  const { verifyPin, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setErrors((prev) => ({ ...prev, email: validateEmail(text) }));
  }, []);

  async function onSubmit() {
    setApiError(null);
    const emailErr = validateEmail(email);
    const pinErr = validatePin(pin);
    setErrors({ email: emailErr, pin: pinErr });
    if (emailErr || pinErr) return;
    try {
      await verifyPin(sanitizeEmail(email), sanitizePin(pin));
      router.replace("/(authenticated)/(tabs)");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
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
      <VInput
        label="Email Address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={handleEmailChange}
        placeholder="you@example.com"
        error={errors.email}
      />
      <VPinField length={6} onComplete={(text) => { setPin(text); setErrors((prev) => ({ ...prev, pin: validatePin(text) })); }} />
      {(apiError || errors.pin) && (
        <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>
          {apiError || errors.pin}
        </Text>
      )}
      <VButton title="Unlock →" loading={isLoading} fullWidth onPress={onSubmit} disabled={pin.length < 4} />
    </AuthShell>
  );
}
