import { Pressable, Text, View } from "react-native";

import { LinearGradient } from "./VLinearGradient";
import { useTheme } from "../../providers/ThemeProvider";
import { VIcon, type VIconName } from "./VIcon";

export interface TabItem {
  key: string;
  label: string;
  icon: VIconName;
  href: string;
}

interface VBottomNavProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect: (tab: TabItem) => void;
}

/**
 * Bottom navigation for the (tabs) group. See `docs/vida-redesign.html` §1
 * (`.sh-nav`) — the active tab gets a 20×2 gradient hairline (iris-2 → ember)
 * floating above it; inactive tabs render in ash and step up to bone when
 * active. The hairline is the visual signature — no badge dots, no glow.
 */
export function VBottomNav({ tabs, activeKey, onSelect }: VBottomNavProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: tokens["--vida-bg"],
        borderTopWidth: 1,
        borderTopColor: tokens["--vida-border"],
        paddingBottom: 18,
        paddingTop: 10,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={{
              flex: 1,
              alignItems: "center",
              position: "relative",
              paddingTop: 4,
            }}
          >
            {/* Active gradient hairline — the design's signature. */}
            {active ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -10,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <LinearGradient
                  colors={[tokens["--vida-primary-light"], tokens["--vida-accent"]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: 20,
                    height: 2,
                    borderRadius: 1,
                  }}
                />
              </View>
            ) : null}
            <VIcon
              name={tab.icon}
              size={16}
              color={active ? tokens["--vida-text-primary"] : tokens["--vida-text-dim"]}
            />
            <Text
              style={{
                fontSize: 9,
                marginTop: 3,
                color: active ? tokens["--vida-text-primary"] : tokens["--vida-text-dim"],
                fontWeight: active ? "700" : "500",
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
