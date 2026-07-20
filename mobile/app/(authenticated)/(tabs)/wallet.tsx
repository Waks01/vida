import { useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useWallet } from "../../../src/features/wallet/hooks/useWallet";
import { useAdReward } from "../../../src/features/ads/hooks/useAdReward";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { formatCoins } from "../../../src/shared/utils/format";

function EarnRow({
  icon,
  title,
  subtitle,
  actionLabel,
  variant,
  onPress,
  loading,
}: {
  icon: any;
  title: string;
  subtitle: string;
  actionLabel: string;
  variant: "primary" | "coin";
  onPress: () => void;
  loading?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tokens["--vida-surface"],
        borderWidth: 1,
        borderColor: tokens["--vida-border"],
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <VIcon name={icon} size={24} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 11, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <VButton title={actionLabel} variant={variant} size="sm" onPress={onPress} loading={loading} />
    </View>
  );
}

export default function WalletScreen() {
  const { tokens } = useTheme();
  const { balance, packs, transactions, checkIn } = useWallet();
  const { watchAd, isLoading: adLoading } = useAdReward();
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

  const handleVip = () => router.push("/vip-subscription");

  const handleCheckIn = async () => {
    try {
      const res = await checkIn.mutateAsync();
      Alert.alert("Daily check-in", `+${res.awarded} coins! New balance: ${res.balance}`);
    } catch (e) {
      Alert.alert("Check-in failed", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleAd = async () => {
    const res = await watchAd();
    if (res) Alert.alert("Reward", `+${res.awarded} coins!`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", padding: 16 }}>Wallet</Text>

      {/* Balance card */}
      <LinearGradient
        colors={["#5b21b6", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 20, overflow: "hidden" }}
      >
        <Text style={{ fontSize: 11, color: "#c4b5fd", letterSpacing: 1, fontWeight: "600" }}>YOUR BALANCE</Text>
        <Text style={{ fontSize: 34, fontWeight: "900", color: "#fff", marginTop: 4 }}>
          <VIcon name="cash" size={30} color="#fff" /> {formatCoins(balance)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <VButton title="Add Coins" variant="coin" onPress={() => router.push("/coin-history")} />
          </View>
          <View style={{ flex: 1 }}>
            <VButton title="Buy Coins" onPress={handleVip} />
          </View>
        </View>
      </LinearGradient>

      {/* Earn free coins */}
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 }}>
        Earn Free Coins
      </Text>
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <EarnRow icon="play-circle" title="Watch Rewarded Ad" subtitle="30s → +20 coins" actionLabel="Watch" variant="primary" onPress={handleAd} loading={adLoading} />
        <EarnRow icon="calendar" title="Daily Check-in" subtitle="Available! → +100 coins" actionLabel="Claim" variant="coin" onPress={handleCheckIn} loading={checkIn.isPending} />
        <EarnRow icon="people" title="Refer a Friend" subtitle="They join → +50 coins" actionLabel="Share" variant="primary" onPress={handleVip} />
      </View>

      {/* Buy coins */}
      <Text style={{ color: tokens["--vida-text-muted"], paddingHorizontal: 16, marginBottom: 12 }}>
        Buy coins (₦{minNgn} min, ₦{stepNgn} steps · {rate} coins/₦1)
      </Text>
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 }}>
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
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12, paddingHorizontal: 16, marginBottom: 16 }}>
          {coinsToBuy.toLocaleString()} coins for ₦{numericAmount.toLocaleString()}
        </Text>
      ) : null}

      {/* Coin history */}
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 }}>
        Coin history
      </Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
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
            <Text style={{ color: item.amount >= 0 ? tokens["--vida-accent"] : tokens["--vida-text-primary"], fontWeight: "600" }}>
              {item.amount >= 0 ? "+" : ""}
              {item.amount}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 12 }}>No transactions yet</Text>
        }
      />
    </View>
  );
}
