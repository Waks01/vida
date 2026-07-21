import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { VButton } from "../../../shared/components/VButton";
import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";
import { formatCoins } from "../../../shared/utils/format";

/**
 * Bottom sheet shown when a premium episode is locked. Three options:
 *
 * 1. Watch Ad — calls `onWatchAd` (parent fires the rewarded ad and
 *    posts the completion to `walletApi.completeAd`).
 * 2. Use Coins — calls `onUseCoins` (parent debits the wallet).
 * 3. Go VIP — deep-links to the subscription screen.
 *
 * "Maybe Later" dismisses via `onDismiss`; the parent persists the
 * dismissed state so the sheet doesn't re-pop on the next visit.
 */
export function VPlayerUnlockSheet({
  visible,
  coinCost,
  userBalance,
  adRewardCoins,
  isAdLoading,
  isCoinsBusy,
  errorMessage,
  onWatchAd,
  onUseCoins,
  onDismiss,
}: {
  visible: boolean;
  coinCost: number;
  userBalance: number;
  adRewardCoins: number;
  isAdLoading: boolean;
  isCoinsBusy: boolean;
  errorMessage: string | null;
  onWatchAd: () => void;
  onUseCoins: () => void;
  onDismiss: () => void;
}) {
  const { tokens } = useTheme();
  const router = useRouter();
  if (!visible) return null;
  const canAfford = userBalance >= coinCost;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable onPress={onDismiss} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View
        style={{
          backgroundColor: tokens["--vida-surface"],
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          paddingBottom: 32,
          borderTopWidth: 2,
          borderTopColor: tokens["--vida-primary"],
        }}
      >
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: tokens["--vida-border"],
            alignSelf: "center",
            marginBottom: 16,
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <VIcon name="lock-closed" size={20} color={tokens["--vida-text-primary"]} />
          <Text style={{ fontSize: 20, fontWeight: "800", color: tokens["--vida-text-primary"] }}>
            This episode is locked
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: tokens["--vida-text-muted"], textAlign: "center", marginBottom: 20 }}>
          Watch an ad or use coins to keep watching
        </Text>

        {errorMessage ? (
          <View
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderWidth: 1,
              borderColor: tokens["--vida-danger"],
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: tokens["--vida-danger"], fontSize: 12, fontWeight: "600" }}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Option 1: Watch Ad — Free */}
        <Pressable
          onPress={onWatchAd}
          disabled={isAdLoading}
          style={{
            backgroundColor: tokens["--vida-surface-2"],
            borderWidth: 1,
            borderColor: tokens["--vida-accent"],
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
            opacity: isAdLoading ? 0.6 : 1,
          }}
        >
          <VIcon name="tv" size={28} color={tokens["--vida-accent"]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: tokens["--vida-text-primary"] }}>
              Watch Ad — Free
            </Text>
            <Text style={{ fontSize: 11, color: tokens["--vida-text-muted"], marginTop: 2 }}>
              30s rewarded ad · +{adRewardCoins} coins
            </Text>
          </View>
          {isAdLoading ? (
            <Text style={{ fontSize: 12, color: tokens["--vida-accent"] }}>Loading…</Text>
          ) : (
            <VIcon name="arrow-forward" size={18} color={tokens["--vida-primary"]} />
          )}
        </Pressable>

        {/* Option 2: Use Coins */}
        <Pressable
          onPress={canAfford ? onUseCoins : undefined}
          disabled={!canAfford || isCoinsBusy}
          style={{
            backgroundColor: tokens["--vida-surface-2"],
            borderWidth: 1,
            borderColor: canAfford ? tokens["--vida-border"] : tokens["--vida-text-dim"],
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
            opacity: canAfford && !isCoinsBusy ? 1 : 0.5,
          }}
        >
          <VIcon name="star" size={28} color={tokens["--vida-accent"]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: tokens["--vida-text-primary"] }}>
              {isCoinsBusy ? "Unlocking…" : `Use ${coinCost} Coins`}
            </Text>
            <Text style={{ fontSize: 11, color: tokens["--vida-text-muted"], marginTop: 2 }}>
              Balance: {formatCoins(userBalance)} ✦
            </Text>
          </View>
          {!canAfford ? (
            <Text style={{ fontSize: 10, color: tokens["--vida-danger"] }}>Insufficient</Text>
          ) : isCoinsBusy ? (
            <Text style={{ fontSize: 12, color: tokens["--vida-accent"] }}>…</Text>
          ) : null}
        </Pressable>

        {/* Option 3: Go VIP */}
        <Pressable
          onPress={() => router.push("/(authenticated)/vip-subscription" as any)}
          style={{
            backgroundColor: tokens["--vida-primary"],
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <VIcon name="diamond" size={28} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Go VIP — Unlock All</Text>
            <Text style={{ fontSize: 11, color: tokens["--vida-primary-light"], marginTop: 2 }}>
              Paystack / Stripe / Google Pay · $4.99/wk
            </Text>
          </View>
          <VIcon name="arrow-forward" size={18} color="#fff" />
        </Pressable>

        <VButton title="Maybe Later" variant="ghost" fullWidth onPress={onDismiss} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}
