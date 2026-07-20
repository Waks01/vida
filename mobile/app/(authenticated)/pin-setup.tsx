import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";

import { AuthShell } from "../../src/shared/components/AuthShell";
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
    <AuthShell
      icon="lock-closed"
      title="Create a transaction PIN"
      subtitle="Use this PIN to log in and approve purchases or payouts."
      footer={<Text style={{ color: tokens["--vida-text-dim"], fontSize: 11 }}>You'll re-enter it to confirm.</Text>}
    >
      <VPinField length={6} onComplete={setPin} />
      <VButton title="Set PIN →" loading={busy} fullWidth onPress={save} disabled={pin.length < 4} />
    </AuthShell>
  );
}
