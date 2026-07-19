import { Tabs } from "expo-router";
import { useRouter } from "expo-router";

import { VBottomNav, type TabItem } from "../../../src/shared/components/VBottomNav";
import { useTheme } from "../../../src/providers/ThemeProvider";

const TABS: TabItem[] = [
  { key: "home", label: "Home", icon: "🏠", href: "/(tabs)" },
  { key: "search", label: "Search", icon: "🔍", href: "/(tabs)/search" },
  { key: "wallet", label: "Wallet", icon: "✦", href: "/(tabs)/wallet" },
  { key: "profile", label: "Me", icon: "👤", href: "/(tabs)/profile" },
];

export default function TabsLayout() {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => (
        <VBottomNav
          tabs={TABS}
          activeKey={TABS[state.index]?.key ?? "home"}
          onSelect={(t) => router.push(t.href as any)}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
