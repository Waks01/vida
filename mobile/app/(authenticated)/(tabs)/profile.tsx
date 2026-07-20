import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useAuth } from "../../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { THEME_ORDER, type ThemeName } from "../../../src/constants/theme";
import { secureStore } from "../../../src/core/storage/secureStore";

function MenuItem({ icon, label, value, onPress }: { icon: any; label: string; value?: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ backgroundColor: tokens["--vida-surface"], borderWidth: 1, borderColor: tokens["--vida-border"] }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <VIcon name={icon} size={18} />
        <Text style={{ fontSize: 14, flex: 1, color: tokens["--vida-text-primary"] }}>{label}</Text>
        {value ? (
          <Text style={{ fontSize: 12, fontWeight: "700", color: tokens["--vida-accent"] }}>{value}</Text>
        ) : (
          <Text style={{ color: tokens["--vida-text-dim"] }}>›</Text>
        )}
      </View>
      <View
        style={{ height: 1, backgroundColor: tokens["--vida-border"], marginLeft: 50 }}
        onStartShouldSetResponder={() => {
          onPress();
          return true;
        }}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { tokens } = useTheme();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const routerPush = router;

  async function onLogout() {
    await logout();
    await secureStore.clearTokens();
    router.replace("/(unauthenticated)/pin-login");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", padding: 16 }}>Me</Text>

      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: tokens["--vida-surface"],
          borderWidth: 1,
          borderColor: tokens["--vida-border"],
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: tokens["--vida-primary"],
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 22, color: "#fff" }}>{(user?.display_name ?? user?.email ?? "U").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {user?.display_name ?? user?.email ?? "Profile"}
          </Text>
          <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12, marginTop: 2 }}>
            {user?.email ?? "Tap to manage account"}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 1, marginBottom: 16 }}>
        <MenuItem icon="book" label="Watch History" onPress={() => routerPush.push("/(authenticated)/watch-history")} />
        <MenuItem icon="bookmark" label="My List" onPress={() => routerPush.push("/(authenticated)/my-list")} />
        <MenuItem icon="trophy" label="Vida VIP" value="Manage ›" onPress={() => routerPush.push("/(authenticated)/vip-subscription")} />
        <MenuItem icon="videocam" label="Creator Portal" value="Apply ›" onPress={() => routerPush.push("/(authenticated)/creator/apply")} />
        <MenuItem icon="settings" label="Settings" onPress={() => routerPush.push("/(authenticated)/settings")} />
      </View>

      <Text style={{ color: tokens["--vida-text-muted"], marginTop: 8, marginBottom: 8, paddingHorizontal: 16 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 24 }}>
        {THEME_ORDER.map((name: ThemeName) => (
          <VButton
            key={name}
            title={name}
            variant={name === theme ? "primary" : "secondary"}
            size="sm"
            onPress={() => setTheme(name)}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <VButton title="Log out" variant="danger" fullWidth onPress={onLogout} />
      </View>
    </ScrollView>
  );
}
