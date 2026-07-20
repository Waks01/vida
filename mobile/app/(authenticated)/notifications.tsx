import { FlatList, Text, View } from "react-native";

import { VHeader } from "../../src/shared/components/VHeader";
import { VIcon } from "../../src/shared/components/VIcon";
import { useTheme } from "../../src/providers/ThemeProvider";

interface NotificationItem {
  id: string;
  icon: any;
  title: string;
  body: string;
}

const SAMPLE: NotificationItem[] = [
  { id: "n1", icon: "cash", title: "Daily check-in ready!", body: "Claim +100 coins · 1h ago" },
  { id: "n2", icon: "heart", title: "New ep of Billionaire's Heart", body: "Ep 7 just dropped · 3h ago" },
  { id: "n3", icon: "trophy", title: "VIP expires soon", body: "2 days left · 1d ago" },
];

export default function NotificationsScreen() {
  const { tokens } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VHeader title="Notifications" showBack />

      <FlatList
        data={SAMPLE}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 1 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: tokens["--vida-surface"],
              borderWidth: 1,
              borderColor: tokens["--vida-border"],
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <VIcon name={item.icon} size={20} color={tokens["--vida-primary-light"]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>{item.title}</Text>
              <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, marginTop: 2 }}>{item.body}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
