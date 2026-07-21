import { useState, useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { VIcon, type VIconName } from "./VIcon";
import { useTheme } from "../../providers/ThemeProvider";
import { useWallet } from "../../features/wallet/hooks/useWallet";
import { useAdReward } from "../../features/ads/hooks/useAdReward";

/**
 * 2×2 earn grid for the home screen. Replaces the v1 single Daily Check-in
 * banner. Four small commitments (check-in / ad / refer / spin) consistently
 * beat one big one in app store category benchmarks.
 *
 * Mirrors `.sh-earn` in `docs/vida-redesign.html` §1: velvet-2 surface, 1px
 * line border, a decorative brand-tone orb in the corner, 16px icon, 10px
 * bone title, 9px mono ember value, and a small pill CTA tinted to the
 * tile's tone.
 */
export function VWatchEarnGrid() {
  const { checkIn, hasCheckedInToday } = useWallet();
  const { watchAd, isLoading: adLoading } = useAdReward();
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = useCallback(async () => {
    if (hasCheckedInToday || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await checkIn.mutateAsync();
      Alert.alert("Daily check-in", `+${res.awarded} coins. Balance: ${res.balance}`);
    } catch (e) {
      Alert.alert(
        "Check-in failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setCheckingIn(false);
    }
  }, [checkIn, hasCheckedInToday, checkingIn]);

  const handleAd = useCallback(async () => {
    const res = await watchAd();
    if (res) Alert.alert("Reward earned", `+${res.awarded} coins.`);
  }, [watchAd]);

  const handleRefer = useCallback(() => {
    router.push("/(authenticated)/settings" as any);
  }, []);

  const handleSpin = useCallback(() => {
    Alert.alert("Spin the wheel", "Coming soon — drop by tomorrow for a free spin.");
  }, []);

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 14,
        gap: 8,
      }}
    >
      <EarnTile
        tone="daily"
        icon="gift"
        title="Daily check-in"
        value="+100"
        ctaLabel={hasCheckedInToday ? "Claimed" : "Claim"}
        disabled={hasCheckedInToday || checkingIn}
        loading={checkingIn}
        onPress={handleCheckIn}
      />
      <EarnTile
        tone="ad"
        icon="tv"
        title="Watch an ad"
        value="+20"
        ctaLabel="Play"
        loading={adLoading}
        onPress={handleAd}
      />
      <EarnTile
        tone="ref"
        icon="people"
        title="Refer a friend"
        value="+50"
        ctaLabel="Share"
        onPress={handleRefer}
      />
      <EarnTile
        tone="spin"
        icon="sync"
        title="Spin the wheel"
        value="UP TO 500"
        ctaLabel="Spin"
        onPress={handleSpin}
      />
    </View>
  );
}

type Tone = "daily" | "ad" | "ref" | "spin";

/** The tint of the decorative orb in the top-right corner of each tile. */
const TONE_TINT: Record<Tone, string> = {
  daily: "rgba(245, 158, 11, 0.12)",
  ad: "rgba(124, 58, 237, 0.14)",
  ref: "rgba(16, 185, 129, 0.14)",
  spin: "rgba(239, 68, 68, 0.14)",
};

/** CTA pill background — `color-mix(... 20%, transparent)` in the CSS. */
const TONE_BG: Record<Tone, string> = {
  daily: "rgba(245, 158, 11, 0.20)",
  ad: "rgba(124, 58, 237, 0.20)",
  ref: "rgba(16, 185, 129, 0.20)",
  spin: "rgba(239, 68, 68, 0.20)",
};

function EarnTile({
  tone,
  icon,
  title,
  value,
  ctaLabel,
  onPress,
  loading,
  disabled,
}: {
  tone: Tone;
  icon: VIconName;
  title: string;
  value: string;
  ctaLabel: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { tokens } = useTheme();
  const ctaFg =
    tone === "daily" ? tokens["--vida-accent"]
    : tone === "ad" ? tokens["--vida-primary-light"]
    : tone === "ref" ? tokens["--vida-success"]
    : tokens["--vida-danger"];

  return (
    <View
      style={{
        width: "48.5%",
        backgroundColor: tokens["--vida-surface-2"],
        borderWidth: 1,
        borderColor: tokens["--vida-border"],
        borderRadius: 8,
        padding: 12,
        position: "relative",
        overflow: "hidden",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {/* Decorative orb — the design uses this to telegraph the tile's tone. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -8,
          top: -8,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: TONE_TINT[tone],
        }}
      />
      <VIcon
        name={icon}
        size={18}
        color={tokens["--vida-text-primary"]}
        style={{ marginBottom: 6 }}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: tokens["--vida-text-primary"],
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          fontWeight: "700",
          color: tokens["--vida-accent"],
          marginTop: 2,
        }}
      >
        {value} ✦
      </Text>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel} ${title.toLowerCase()}`}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          marginTop: 4,
          backgroundColor: TONE_BG[tone],
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
          opacity: pressed || disabled ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            color: ctaFg,
          }}
        >
          {loading ? "..." : ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}
