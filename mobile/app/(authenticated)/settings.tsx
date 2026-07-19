import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { THEME_ORDER, type ThemeName } from "../../src/constants/theme";
import { useTheme } from "../../src/providers/ThemeProvider";
import { secureStore } from "../../src/core/storage/secureStore";

export default function SettingsScreen() {
  const { tokens } = useTheme();
  const { theme, setTheme } = useTheme();

  async function goPinSetup() {
    const hasPin = await secureStore.isPinSet();
    router.push(hasPin ? "/pin-setup" : "/pin-setup");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Settings
      </Text>

      <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 8 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
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

      <VButton title="Transaction PIN" fullWidth onPress={goPinSetup} />
    </ScrollView>
  );
}
