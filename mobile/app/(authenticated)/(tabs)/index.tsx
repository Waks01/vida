import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";

import { VSeriesCard, type SeriesCardData } from "../../../src/shared/components/VSeriesCard";
import { NativeAdCard } from "../../../src/features/ads/components/NativeAdCard";
import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { injectNativeAds } from "../../../src/features/feed/utils/injectNativeAds";
import { NATIVE_AD_FEED_INTERVAL } from "../../../src/features/ads/constants";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function HomeScreen() {
  const { tokens } = useTheme();
  const { series, isLoading } = useFeed();

  const cards: SeriesCardData[] = series.map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail_url: s.thumbnail_url,
    episodes: s.episodes.length,
    coinsPerEpisode: s.episodes[0]?.coin_cost ?? 0,
  }));

  const deck = injectNativeAds(cards, NATIVE_AD_FEED_INTERVAL, (c) => c.id);

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", padding: 16 }}>
        Trending now
      </Text>
      {isLoading ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={deck}
          keyExtractor={(entry) => entry.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
          renderItem={({ item }) =>
            item.kind === "ad" ? (
              <NativeAdCard variant="grid" style={{ width: "100%" }} />
            ) : (
              <VSeriesCard series={item.value} onPress={(id) => router.push({ pathname: "/(authenticated)/series/[id]", params: { id } })} />
            )
          }
        />
      )}
    </View>
  );
}
