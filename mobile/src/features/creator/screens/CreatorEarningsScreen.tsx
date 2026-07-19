import { useState, useEffect } from "react";
import { Text, View, FlatList, Alert } from "react-native";
import { creatorsApi } from "../../feed/api/creatorsApi";
import { VButton } from "../../../shared/components/VButton";
import { VPinField } from "../../../shared/components/VPinField";
import { useTheme } from "../../../providers/ThemeProvider";

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
      setPayouts(data.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
      })));
    } catch {
      // ignore
    }
  };

  const handlePayout = async () => {
    if (pin.length < 4) {
      Alert.alert("PIN required", "Please enter your transaction PIN.");
      return;
    }
    setLoading(true);
    try {
      const result = await creatorsApi.requestPayout(pin);
      Alert.alert(
        "Payout requested",
        `$${result.total_earnings.toFixed(2)} payout initiated via Paystack.`,
        [{ text: "OK", onPress: () => { loadEarnings(); loadPayouts(); setPin(""); } }]
      );
    } catch (e) {
      Alert.alert("Payout failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Earnings & Payouts
      </Text>

      {earnings && (
        <View style={{ backgroundColor: tokens["--vida-surface"], padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13 }}>Total earnings (65% revenue share)</Text>
          <Text style={{ color: tokens["--vida-accent"], fontSize: 32, fontWeight: "800" }}>
            ${earnings.total_earnings.toFixed(2)}
          </Text>
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4 }}>
            {earnings.series_count} published series
          </Text>
        </View>
      )}

      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
        Request payout (min $50)
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginBottom: 12 }}>
        Paid via Paystack to your bank account.
      </Text>

      <VPinField length={4} onComplete={setPin} secure />
      <VButton
        title={loading ? "Processing…" : "Request payout"}
        onPress={handlePayout}
        disabled={loading || (earnings?.total_earnings ?? 0) < 50}
        style={{ marginTop: 12 }}
      />

      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8 }}>
        Payout history
      </Text>
      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
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
            <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>
              ${item.amount.toFixed(2)}
            </Text>
            <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
              {item.status} · {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 12 }}>
            No payouts yet
          </Text>
        }
      />
    </View>
  );
}
