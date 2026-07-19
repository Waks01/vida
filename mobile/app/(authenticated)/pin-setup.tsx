import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VPinField } from "../../src/shared/components/VPinField";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { secureStore } from "../../src/core/storage/secureStore";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function PinSetup() {
  const { tokens } = useTheme();
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (pin.length < 4) return;
    setBusy(true);
    try {
      // Needs a valid access token; user may be null in Phase 0 dev.
      const token = await secureStore.getAccessToken();
      if (token && user) {
        const { authApi } = await import("../../src/features/auth/api/authApi");
        await authApi.setPin({ pin }, token);
      }
      await secureStore.setPinSet(true);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 24, justifyContent: "center" }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
        Set your PIN
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 20 }}>
        Used to log in and approve purchases.
      </Text>
      <VPinField length={6} onComplete={setPin} />
      <VButton title="Save PIN" loading={busy} fullWidth onPress={save} style={{ marginTop: 24 }} disabled={pin.length < 4} />
    </View>
  );
}
