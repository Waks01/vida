import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VInput } from "../../../src/shared/components/VInput";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { creatorsApi } from "../../../src/features/feed/api/creatorsApi";

export default function CreatorApply() {
  const { tokens } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("paystack");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!displayName.trim() || !payoutDetails.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      await creatorsApi.apply({
        display_name: displayName.trim(),
        payout_method: payoutMethod,
        payout_details: payoutDetails.trim(),
      });
      Alert.alert("Success", "Your creator application has been submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Become a creator
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 16 }}>
        Earn 65% of ad revenue + coin unlocks from your series. Paid via Paystack / Stripe to your bank.
      </Text>
      <VInput label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your creator name" />
      <VInput label="Payout method" value={payoutMethod} onChangeText={setPayoutMethod} placeholder="paystack or stripe" />
      <VInput label="Payout details (email/account)" value={payoutDetails} onChangeText={setPayoutDetails} placeholder="your@email.com" />
      <VButton
        title={submitting ? "Submitting…" : "Submit application"}
        fullWidth
        onPress={submit}
        style={{ marginTop: 12 }}
        disabled={submitting}
      />
    </ScrollView>
  );
}
