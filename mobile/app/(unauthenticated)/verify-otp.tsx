import { useState, useCallback } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
import { VButton } from "../../src/shared/components/VButton";
import { VPinField } from "../../src/shared/components/VPinField";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";
import { validateOtpCode, type ValidationErrors } from "../../src/features/auth/utils/validation";

export default function VerifyOtp() {
  const { tokens } = useTheme();
  const { verifyOtp, isLoading, error } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    setCode(text);
    setErrors((prev) => ({ ...prev, code: validateOtpCode(text) }));
  }, []);

  async function onSubmit() {
    setApiError(null);
    const codeErr = validateOtpCode(code);
    setErrors({ code: codeErr });
    if (codeErr) return;
    if (!email) return;
    try {
      await verifyOtp(email, code.trim());
      router.replace("/(authenticated)/(tabs)");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
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
      <VPinField length={6} secure={false} onComplete={handleCodeChange} />
      {(apiError || errors.code) && (
        <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>
          {apiError || errors.code}
        </Text>
      )}
      <VButton title="Verify →" loading={isLoading} fullWidth onPress={onSubmit} disabled={code.length < 6} />
    </AuthShell>
  );
}
