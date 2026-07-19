import { useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VBadge } from "../../../src/shared/components/VBadge";
import { useWallet } from "../../../src/features/wallet/hooks/useWallet";
import { walletApi } from "../../../src/features/wallet/api/walletApi";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function WalletScreen() {
  const { tokens } = useTheme();
  const { balance, packs, transactions, isLoading, checkIn } = useWallet();
  const [amount, setAmount] = useState("");
  const [buying, setBuying] = useState(false);

  const rate = packs.coinRate ?? 10;
  const minNgn = packs.minNgn ?? 100;
  const stepNgn = packs.stepNgn ?? 100;

  const numericAmount = parseInt(amount, 10);
  const isValid = !Number.isNaN(numericAmount) && numericAmount >= minNgn && numericAmount % stepNgn === 0;
  const coinsToBuy = isValid ? numericAmount * rate : 0;

  const handleBuy = async () => {
    if (!isValid || buying) return;
    setBuying(true);
    try {
      router.push({
        pathname: "/payment-method",
        params: { packId: "coin_pack", amount: String(numericAmount), currency: "NGN" },
      });
    } catch (e) {
      Alert.alert("Purchase failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBuying(false);
    }
  };

  const handleVip = () => {
    router.push("/vip-subscription");
  };

  const handleCheckIn = async () => {
    try {
      const res = await checkIn.mutateAsync();
      Alert.alert("Daily check-in", `+${res.awarded} coins! New balance: ${res.balance}`);
    } catch (e) {
      Alert.alert("Check-in failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800" }}>Wallet</Text>
      <View style={{ marginVertical: 16, alignItems: "center" }}>
        {isLoading ? (
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        ) : (
          <VBadge coins={balance} />
        )}
      </View>

      <VButton title="Daily check-in (+coins)" onPress={handleCheckIn} disabled={checkIn.isPending} />

      <VButton title="👑 Go VIP — $4.99/week" onPress={handleVip} variant="secondary" style={{ marginVertical: 8 }} />

      <Text style={{ color: tokens["--vida-text-muted"], marginVertical: 12 }}>
        Buy coins (₦{minNgn} min, ₦{stepNgn} steps · {rate} coins/₦1)
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={`₦${minNgn}`}
          keyboardType="number-pad"
          placeholderTextColor={tokens["--vida-text-dim"]}
          style={{
            flex: 1,
            backgroundColor: tokens["--vida-surface"],
            color: tokens["--vida-text-primary"],
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: isValid ? tokens["--vida-primary"] : tokens["--vida-border"],
          }}
        />
        <VButton
          title={buying ? "Processing…" : isValid ? `Buy ${coinsToBuy.toLocaleString()}` : "Buy"}
          disabled={!isValid || buying}
          onPress={handleBuy}
        />
      </View>

      {isValid ? (
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12, marginBottom: 16 }}>
          {coinsToBuy.toLocaleString()} coins for ₦{numericAmount.toLocaleString()}
        </Text>
      ) : null}

      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
        Coin history
      </Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: tokens["--vida-border"],
            }}
          >
            <Text style={{ color: tokens["--vida-text-primary"], flex: 1 }}>{item.source}</Text>
            <Text
              style={{
                color: item.amount >= 0 ? tokens["--vida-accent"] : tokens["--vida-text-primary"],
                fontWeight: "600",
              }}
            >
              {item.amount >= 0 ? "+" : ""}
              {item.amount}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 12 }}>
            No transactions yet
          </Text>
        }
      />
    </View>
  );
}
