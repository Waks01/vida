import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { VSeriesCard } from "../../../../src/shared/components/VSeriesCard";
import { useFeed } from "../../../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../../../src/providers/ThemeProvider";
import { FORM_CATEGORIES, TROPE_CATEGORIES } from "../../../../src/features/feed/types";

const COLUMNS = 2;

export default function CategoryListScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();

  const category = useMemo(() => {
    if (!key) return null;
    const all = [...FORM_CATEGORIES, ...TROPE_CATEGORIES];
    const found = all.find((c) => c.key === key);
    return found?.label ?? key;
  }, [key]);

  const { series, isLoading, refetch } = useFeed({ category: key ?? undefined });

  const navigateToSeries = (id: string) => {
    router.push({ pathname: "/(authenticated)/series/[id]", params: { id } });
  };

  const cards = useMemo(
    () =>
      series.map((s) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url,
        episodes: s.episodes.length,
        coinsPerEpisode: s.episodes[0]?.coin_cost ?? 18,
        views: s.total_views,
      })),
    [series],
  );

  if (!key) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens["--vida-bg"],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: tokens["--vida-text-muted"] }}>Missing category</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 14 }}
        contentContainerStyle={{ paddingVertical: 12, gap: 10 }}
        refreshing={isLoading}
        onRefresh={() => refetch()}
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, maxWidth: "50%" }}
            onPress={() => navigateToSeries(item.id)}
          >
            <VSeriesCard series={item} compact onPress={navigateToSeries} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 40,
            }}
          >
            <Text style={{ color: tokens["--vida-text-muted"] }}>
              {isLoading ? "Loading…" : "No series in this category yet"}
            </Text>
          </View>
        }
        ListHeaderComponent={() => (
          <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: tokens["--vida-text-primary"],
              }}
            >
              {category}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: tokens["--vida-text-dim"],
                marginTop: 4,
              }}
            >
              {cards.length} {cards.length === 1 ? "series" : "series"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
