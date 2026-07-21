import { Pressable, Text, View } from "react-native";

import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";

/**
 * Floating "Watch ad · +N coins" pill rendered above the bottom
 * overlay. Only visible when the episode is locked — gives the user
 * a one-tap shortcut to the rewarded-ad flow without opening the
 * unlock sheet. Tapping it fires `onPress` (parent calls
 * `useAdReward().watchAd` then unlocks the episode on success).
 */
export function VPlayerAdPill({
  visible,
  adRewardCoins,
  isLoading,
  onPress,
}: {
  visible: boolean;
  adRewardCoins: number;
  isLoading: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 140,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 8,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={isLoading}
        style={{
          backgroundColor: "rgba(15, 11, 26, 0.9)",
          borderWidth: 1,
          borderColor: tokens["--vida-accent"],
          borderRadius: 999,
          paddingHorizontal: 18,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        <VIcon name="tv" size={14} color={tokens["--vida-accent"]} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: tokens["--vida-accent"] }}>
          {isLoading ? "Loading…" : `Watch ad · +${adRewardCoins} ✦`}
        </Text>
      </Pressable>
    </View>
  );
}
