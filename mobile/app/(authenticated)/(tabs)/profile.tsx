import { ScrollView, Text, View } from "react-native";

import { VButton } from "../../../src/shared/components/VButton";
import { useAuth } from "../../../src/features/auth/hooks/useAuth";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { THEME_ORDER, type ThemeName } from "../../../src/constants/theme";
import { secureStore } from "../../../src/core/storage/secureStore";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { tokens } = useTheme();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function onLogout() {
    await logout();
    await secureStore.clearTokens();
    router.replace("/(unauthenticated)/pin-login");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800" }}>
        {user?.display_name ?? user?.email ?? "Profile"}
      </Text>

      <Text style={{ color: tokens["--vida-text-muted"], marginTop: 24, marginBottom: 8 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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

      <View style={{ marginTop: 32 }}>
        <VButton title="Log out" variant="danger" fullWidth onPress={onLogout} />
      </View>
    </ScrollView>
  );
}
