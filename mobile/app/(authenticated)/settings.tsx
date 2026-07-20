import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VIcon } from "../../src/shared/components/VIcon";
import { THEME_ORDER, type ThemeName } from "../../src/constants/theme";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { secureStore } from "../../src/core/storage/secureStore";

function Row({ icon, label, value, onPress }: { icon: any; label: string; value?: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ backgroundColor: tokens["--vida-surface"], borderWidth: 1, borderColor: tokens["--vida-border"] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
        <VIcon name={icon} size={18} />
        <Text style={{ fontSize: 14, flex: 1, color: tokens["--vida-text-primary"] }}>{label}</Text>
        <Text style={{ color: value ? tokens["--vida-accent"] : tokens["--vida-text-dim"], fontSize: value ? 12 : 16, fontWeight: value ? "700" : "400" }}>
          {value ?? "›"}
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: tokens["--vida-border"], marginLeft: 50 }} onStartShouldSetResponder={() => { onPress(); return true; }} />
    </View>
  );
}

export default function SettingsScreen() {
  const { tokens } = useTheme();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  async function goPinSetup() {
    router.push("/pin-setup");
  }

  async function onLogout() {
    await logout();
    await secureStore.clearTokens();
    router.replace("/(unauthenticated)/pin-login");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", padding: 16 }}>Settings</Text>

      <View style={{ paddingHorizontal: 16, gap: 1, marginBottom: 16 }}>
        <Row icon="lock-closed" label="Change PIN" onPress={goPinSetup} />
        <Row icon="card" label="Payment Methods" onPress={() => router.push({ pathname: "/payment-method", params: { packId: "coin_pack", amount: "100", currency: "NGN" } })} />
        <Row icon="color-palette" label="Theme" value="Dark (default) ›" onPress={() => undefined} />
        <Row icon="notifications" label="Notifications" value="On ›" onPress={() => router.push("/(authenticated)/notifications")} />
        <Row icon="help-circle" label="Help & Support" onPress={() => undefined} />
        <Row icon="log-out" label="Log out" onPress={onLogout} />
      </View>

      <Text style={{ color: tokens["--vida-text-muted"], marginTop: 8, marginBottom: 8, paddingHorizontal: 16 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
        {THEME_ORDER.map((name: ThemeName) => (
          <VButton key={name} title={name} variant={name === theme ? "primary" : "secondary"} size="sm" onPress={() => setTheme(name)} />
        ))}
      </View>
    </ScrollView>
  );
}
