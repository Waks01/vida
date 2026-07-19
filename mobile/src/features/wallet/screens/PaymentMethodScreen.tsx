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

interface PaymentMethodScreenProps {
  packId: string;
  amount: number;
  currency?: string;
  onSuccess?: () => void;
}

export default function PaymentMethodScreen({ packId, amount, currency = "NGN", onSuccess }: PaymentMethodScreenProps) {
  const { tokens } = useTheme();
  const [provider, setProvider] = useState<Provider>("paystack");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const numericAmount = typeof amount === "number" ? amount : Number.parseFloat(String(amount));

  const handlePay = async () => {
    if (pin.length < 4) {
      Alert.alert("PIN required", "Please enter your transaction PIN.");
      return;
    }
    setLoading(true);
    try {
      const result = await walletApi.startPurchase(packId, provider, pin, Number.isFinite(numericAmount) ? numericAmount : undefined);
      Alert.alert(
        "Payment initiated",
        `Provider: ${result.provider}\nReference: ${result.reference}\n\nIn production, this opens ${provider === "paystack" ? "Paystack checkout" : provider === "stripe" ? "Stripe" : "Google Pay"}.`,
        [{ text: "OK", onPress: () => onSuccess?.() }]
      );
    } catch (e) {
      Alert.alert("Payment failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", marginBottom: 4 }}>
        Choose payment method
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 20 }}>
        Pay {currency} {numericAmount.toLocaleString()} for coins
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
        <VButton title={loading ? "Processing…" : "Pay now"} onPress={handlePay} disabled={loading} />
      </View>
    </View>
  );
}
