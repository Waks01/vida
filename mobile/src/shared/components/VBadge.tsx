import { Text, View } from "react-native";

import { formatCoins } from "../utils/format";
import { useTheme } from "../../providers/ThemeProvider";

/** Coin balance chip with ✦ glyph (vida-design.html §2 "Badge"). */
export function VBadge({ coins }: { coins: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: tokens["--vida-surface-2"],
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: tokens["--vida-accent"], fontWeight: "700", marginRight: 4 }}>✦</Text>
      <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>
        {formatCoins(coins)}
      </Text>
    </View>
  );
}
