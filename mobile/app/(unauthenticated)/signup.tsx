import { useState, useCallback } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
import { VButton } from "../../src/shared/components/VButton";
import { VInput } from "../../src/shared/components/VInput";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../src/providers/ThemeProvider";
import { validateEmail, validatePassword, sanitizeEmail, sanitizePassword, type ValidationErrors } from "../../src/features/auth/utils/validation";

export default function SignUp() {
  const { tokens } = useTheme();
  const { signUp, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  const validate = useCallback((emailVal: string, passwordVal: string) => {
    const emailErr = validateEmail(emailVal);
    const passwordErr = validatePassword(passwordVal);
    setErrors({ email: emailErr, password: passwordErr });
    return !emailErr && !passwordErr;
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    if (touched.email) {
      validate(text, password);
    }
  }, [touched.email, password, validate]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    if (touched.password) {
      validate(email, text);
    }
  }, [touched.password, email, validate]);

  const handleEmailBlur = useCallback(() => {
    setTouched((t) => ({ ...t, email: true }));
    validate(email, password);
  }, [email, password, validate]);

  const handlePasswordBlur = useCallback(() => {
    setTouched((t) => ({ ...t, password: true }));
    validate(email, password);
  }, [email, password, validate]);

  async function onSubmit() {
    setApiError(null);
    setTouched({ email: true, password: true });
    if (!validate(email, password)) return;
    try {
      await signUp(sanitizeEmail(email), sanitizePassword(password));
      router.push({ pathname: "/verify-otp", params: { email: sanitizeEmail(email) } });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
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
      <VInput
        label="Email Address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={handleEmailChange}
        onBlur={handleEmailBlur}
        placeholder="you@example.com"
        error={touched.email ? errors.email : undefined}
      />
      <VInput
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={handlePasswordChange}
        onBlur={handlePasswordBlur}
        placeholder="Min. 8 characters"
        error={touched.password ? errors.password : undefined}
      />
      {(apiError) && (
        <Text style={{ color: tokens["--vida-danger"], fontSize: 12 }}>
          {apiError}
        </Text>
      )}
      <VButton title="Continue →" loading={isLoading} fullWidth onPress={onSubmit} style={{ marginTop: 8 }} />
      <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, textAlign: "center" }}>
        By continuing you agree to Terms & Privacy
      </Text>
    </AuthShell>
  );
}
