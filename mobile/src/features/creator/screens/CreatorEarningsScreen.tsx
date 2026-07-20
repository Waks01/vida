import { useState, useEffect } from "react";
import { Text, View, FlatList, Alert, ScrollView } from "react-native";

import { VButton } from "../../../shared/components/VButton";
import { VIcon } from "../../../shared/components/VIcon";
import { VPinField } from "../../../shared/components/VPinField";
import { useTheme } from "../../../providers/ThemeProvider";
import { creatorsApi } from "../../feed/api/creatorsApi";

export default function CreatorEarningsScreen() {
  const { tokens } = useTheme();
  const [earnings, setEarnings] = useState<{ total_earnings: number; pending_payout: number; series_count: number } | null>(null);
  const [payouts, setPayouts] = useState<{ id: string; amount: number; status: string; created_at: string }[]>([]);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEarnings();
    loadPayouts();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await creatorsApi.getEarnings();
      setEarnings(data);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load earnings");
    }
  };

  const loadPayouts = async () => {
    try {
      const data = await creatorsApi.getPayouts();
      setPayouts(
        data.map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          created_at: p.created_at,
        }))
      );
    } catch {
      // ignore
    }
  };

  const handlePayout = async () => {
    if (pin.length < 4) {
      Alert.alert("PIN required", "Please enter your transaction PIN.");
      return;
    }
    if ((earnings?.total_earnings ?? 0) < 50) {
      Alert.alert("Min $50", "You need at least $50 to request a payout.");
      return;
    }
    setLoading(true);
    try {
      const result = await creatorsApi.requestPayout(pin);
      Alert.alert("Payout requested", `$${result.total_earnings.toFixed(2)} payout initiated via Paystack.`, [
        { text: "OK", onPress: () => { loadEarnings(); loadPayouts(); setPin(""); } },
      ]);
    } catch (e) {
      Alert.alert("Payout failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const total = earnings?.total_earnings ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      {earnings && (
        <View style={{ backgroundColor: tokens["--vida-surface"], padding: 16, borderRadius: 16, marginBottom: 16 }}>
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13 }}>TOTAL EARNINGS</Text>
          <Text style={{ color: tokens["--vida-accent"], fontSize: 32, fontWeight: "800" }}>${total.toFixed(2)}</Text>
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4 }}>
            {earnings.series_count} published series · 65% of ad revenue
          </Text>
        </View>
      )}

      {/* Payout request (PIN) */}
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <VIcon name="cash" size={40} color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 20, fontWeight: "800", marginTop: 8 }}>Confirm payout</Text>
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4, textAlign: "center" }}>
          Enter PIN to request <Text style={{ fontWeight: "700" }}>${total.toFixed(2)}</Text> → bank/Paystack
        </Text>
      </View>

      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <VPinField length={4} onComplete={setPin} secure />
      </View>

      <VButton
        title={loading ? "Processing…" : "Request Payout"}
        fullWidth
        onPress={handlePayout}
        disabled={loading || total < 50}
      />
      <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, textAlign: "center", marginTop: 10 }}>
        Min $50 · Processed within 7 days
      </Text>

      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 }}>
        Payout history
      </Text>
      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 14,
              backgroundColor: tokens["--vida-surface"],
              borderRadius: 10,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: tokens["--vida-border"],
            }}
          >
            <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>${item.amount.toFixed(2)}</Text>
            <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
              {item.status} · {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 12 }}>No payouts yet</Text>
        }
      />
    </ScrollView>
  );
}
