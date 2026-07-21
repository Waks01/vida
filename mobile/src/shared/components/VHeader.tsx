import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { useTheme } from "../../providers/ThemeProvider";

/** Screen header with optional back button + title. vida-design.html §2. */
export function VHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        marginTop: 18,
        borderBottomWidth: 1,
        borderBottomColor: tokens["--vida-border"],
      }}
    >
      {showBack ? (
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: 12 }}>
          <Text style={{ color: tokens["--vida-primary"], fontSize: 22 }}>←</Text>
        </Pressable>
      ) : (
        <View style={{ width: showBack ? 22 : 0 }} />
      )}
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 17, fontWeight: "700", flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}
