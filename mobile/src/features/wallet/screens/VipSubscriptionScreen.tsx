import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { VButton } from "../../../shared/components/VButton";
import { VPinField } from "../../../shared/components/VPinField";
import { useTheme } from "../../../providers/ThemeProvider";
import { walletApi } from "../api/walletApi";

type Provider = "paystack" | "stripe" | "googlepay";

const PROVIDERS: { id: Provider; label: string; desc: string }[] = [
  { id: "paystack", label: "Paystack", desc: "Cards, Bank, Mobile Money" },
  { id: "stripe", label: "Stripe", desc: "Cards, Apple/Google Pay" },
  { id: "googlepay", label: "Google Pay", desc: "One-tap checkout" },
];

const VIP_WEEKLY_USD = 4.99;

export default function VipSubscriptionScreen({ onSuccess }: { onSuccess?: () => void }) {
  const { tokens } = useTheme();
  const [provider, setProvider] = useState<Provider>("paystack");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (pin.length < 4) {
      Alert.alert("PIN required", "Please enter your transaction PIN.");
      return;
    }
    setLoading(true);
    try {
      const result = await walletApi.startPurchase("subscription", provider, pin, VIP_WEEKLY_USD);
      Alert.alert(
        "Subscription initiated",
        `Provider: ${result.provider}\nReference: ${result.reference}\n\nIn production, this opens ${provider === "paystack" ? "Paystack checkout" : provider === "stripe" ? "Stripe" : "Google Pay"}.`,
        [{ text: "OK", onPress: () => onSuccess?.() }]
      );
    } catch (e) {
      Alert.alert("Subscription failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", marginBottom: 4 }}>
        👑 Vida VIP
      </Text>
      <Text style={{ color: tokens["--vida-accent"], fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
        ${VIP_WEEKLY_USD}/week
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 20 }}>
        Unlock all episodes ad-free. Cancel anytime.
      </Text>

      {PROVIDERS.map((p) => (
        <VButton
          key={p.id}
          title={`${p.label} — ${p.desc}`}
          variant={provider === p.id ? "primary" : "secondary"}
          onPress={() => setProvider(p.id)}
          style={{ marginBottom: 10 }}
        />
      ))}

      <Text style={{ color: tokens["--vida-text-muted"], marginVertical: 16, textAlign: "center" }}>
        Enter transaction PIN to confirm
      </Text>
      <VPinField length={4} onComplete={setPin} secure />

      <View style={{ marginTop: 24 }}>
        <VButton title={loading ? "Processing…" : "Subscribe"} onPress={handleSubscribe} disabled={loading} />
      </View>
    </View>
  );
}
