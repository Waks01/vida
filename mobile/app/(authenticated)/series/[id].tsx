import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VBadge } from "../../../src/shared/components/VBadge";
import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function SeriesDetail() {
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { series } = useFeed();

  const s = series.find((x) => x.id === id);

  if (!s) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", padding: 16 }}>
        {s.title}
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], paddingHorizontal: 16, marginBottom: 16 }}>
        {s.description}
      </Text>
      <FlatList
        data={s.episodes}
        keyExtractor={(ep) => ep.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: tokens["--vida-border"],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>
                Ep {item.episode_number}: {item.title}
              </Text>
              <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12, marginTop: 2 }}>
                {item.duration_seconds}s · {item.is_premium ? "Premium" : "Free"}
              </Text>
            </View>
            <VBadge coins={item.coin_cost} />
          </View>
        )}
      />
      <View style={{ padding: 16 }}>
        <VButton
          title="Play series"
          fullWidth
          onPress={() => router.push({ pathname: "/(authenticated)/player", params: { seriesId: id } })}
        />
      </View>
    </View>
  );
}
