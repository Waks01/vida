import { Pressable, Text, View } from "react-native";

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

/** Bottom navigation for the (tabs) group. See vida-design.html §2 "BottomNav". */
export function VBottomNav({ tabs, activeKey, onSelect }: VBottomNavProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: tokens["--vida-surface"],
        borderTopWidth: 1,
        borderTopColor: tokens["--vida-border"],
        paddingBottom: 8,
        paddingTop: 8,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab)}
            style={{ flex: 1, alignItems: "center" }}
          >
            <VIcon name={tab.icon} size={20} color={active ? tokens["--vida-primary"] : tokens["--vida-text-dim"]} />
            <Text
              style={{
                fontSize: 11,
                marginTop: 2,
                color: active ? tokens["--vida-primary"] : tokens["--vida-text-dim"],
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
