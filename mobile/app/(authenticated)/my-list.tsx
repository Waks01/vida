import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";

import { VHeader } from "../../src/shared/components/VHeader";
import { VSeriesCard } from "../../src/shared/components/VSeriesCard";
import { useFeed } from "../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function MyListScreen() {
  const { tokens } = useTheme();
  const { series, isLoading } = useFeed();

  const saved = series.slice(0, 8).map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail_url: s.thumbnail_url,
    episodes: s.episodes.length,
    coinsPerEpisode: s.episodes[0]?.coin_cost ?? 0,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VHeader title="My List" showBack />

      {isLoading ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        </View>
      ) : saved.length === 0 ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Your list is empty</Text>
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <VSeriesCard
              series={item}
              onPress={(id) => router.push({ pathname: "/(authenticated)/series/[id]", params: { id } })}
            />
          )}
        />
      )}
    </View>
  );
}
