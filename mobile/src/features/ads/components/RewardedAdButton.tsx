import { useEffect, useState } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import { VButton } from "../../../shared/components/VButton";
import { useAdReward } from "../hooks/useAdReward";
import { useTheme } from "../../../providers/ThemeProvider";

type State = "idle" | "loading" | "success" | "error" | "empty";

interface RewardedAdButtonProps {
  coinReward?: number;
  onRewardClaimed?: (coins: number, newBalance: number) => void;
  style?: ViewStyle;
  fullWidth?: boolean;
  disabled?: boolean;
  title?: string;
}

export function RewardedAdButton({
  coinReward = 20,
  onRewardClaimed,
  style,
  fullWidth = true,
  disabled = false,
  title,
}: RewardedAdButtonProps) {
  const { tokens } = useTheme();
  const { watchAd, isLoading, error, dailyRemaining, isAdReady } = useAdReward();
  const [state, setState] = useState<State>(dailyRemaining > 0 ? "empty" : "idle");

  useEffect(() => {
    if (dailyRemaining <= 0) {
      setState("empty");
    }
  }, [dailyRemaining]);

  const handlePress = async () => {
    if (isLoading || disabled || !isAdReady) return;
    setState("loading");
    const result = await watchAd();
    if (result) {
      setState("success");
      onRewardClaimed?.(result.awarded, result.balance);
      setTimeout(() => setState("idle"), 3000);
    } else if (error) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  if (state === "empty") {
    return (
      <View style={[style, { opacity: 0.5 }]}>
        <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", fontSize: 13 }}>
          Daily ad limit reached. Come back tomorrow!
        </Text>
      </View>
    );
  }

  if (state === "success") {
    return (
      <View style={[style]}>
        <Text style={{ color: tokens["--vida-accent"], textAlign: "center", fontSize: 14, fontWeight: "700" }}>
          +{coinReward} coins awarded!
        </Text>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={[style]}>
        <Text style={{ color: "#ef4444", textAlign: "center", fontSize: 13 }}>
          {error ?? "Something went wrong. Try again."}
        </Text>
      </View>
    );
  }

  const buttonDisabled = disabled || !isAdReady || isLoading;
  const buttonTitle = title
    ? title
    : !isAdReady
      ? "Loading ad…"
      : isLoading
        ? "Watching ad…"
        : `Watch Ad (+${coinReward} coins)`;

  return (
    <VButton
      title={buttonTitle}
      variant={!isAdReady ? "secondary" : isLoading ? "secondary" : "primary"}
      loading={isLoading}
      fullWidth={fullWidth}
      disabled={buttonDisabled}
      onPress={handlePress}
      style={style}
    />
  );
}
