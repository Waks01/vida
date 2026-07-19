import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { VButton } from "../../../shared/components/VButton";
import { VPinField } from "../../../shared/components/VPinField";
import { useTheme } from "../../../providers/ThemeProvider";
import { httpClient } from "../../../core/api/httpClient";

interface AdjustPayload {
  target_user_id: string;
  amount: number;
  pin: string;
}

export default function AdminAdjustCoinsScreen() {
  const { tokens } = useTheme();
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdjust = async () => {
    const numericAmount = Number.parseInt(amount, 10);
    if (!targetUserId.trim() || Number.isNaN(numericAmount) || pin.length < 4) {
      Alert.alert("Invalid input", "Please fill all fields correctly.");
      return;
    }
    setLoading(true);
    try {
      const payload: AdjustPayload = {
        target_user_id: targetUserId.trim(),
        amount: numericAmount,
        pin,
      };
      const { data } = await httpClient.post("/admin/users/adjust-coins", payload);
      Alert.alert("Adjusted", `New balance: ${data.balance}`);
      setTargetUserId("");
      setAmount("");
      setPin("");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Adjust Coins
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 20 }}>
        Positive amount credits coins, negative debits. PIN required.
      </Text>

      <TextInput
        value={targetUserId}
        onChangeText={setTargetUserId}
        placeholder="Target user ID"
        placeholderTextColor={tokens["--vida-text-dim"]}
        style={{
          backgroundColor: tokens["--vida-surface"],
          color: tokens["--vida-text-primary"],
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: tokens["--vida-border"],
        }}
      />
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount (e.g. 100 or -50)"
        keyboardType="number-pad"
        placeholderTextColor={tokens["--vida-text-dim"]}
        style={{
          backgroundColor: tokens["--vida-surface"],
          color: tokens["--vida-text-primary"],
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: tokens["--vida-border"],
        }}
      />
      <VPinField length={4} onComplete={setPin} secure />

      <View style={{ marginTop: 24 }}>
        <VButton title={loading ? "Processing…" : "Adjust coins"} onPress={handleAdjust} disabled={loading} />
      </View>
    </View>
  );
}
