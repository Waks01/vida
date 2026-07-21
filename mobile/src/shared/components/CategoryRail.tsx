import { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";

import { useFeed } from "../../features/feed/hooks/useFeed";
import { injectNativeAds } from "../../features/feed/utils/injectNativeAds";
import { NativeAdCard } from "../../features/ads/components/NativeAdCard";
import { NATIVE_AD_FEED_INTERVAL } from "../../features/ads/constants";
import { VSeriesCard, type SeriesCardData } from "./VSeriesCard";
import type { SeriesCategory } from "../../features/feed/types";

/**
 * One home rail per category — mounts its own `useFeed({ category })`,
 * slices the result to 10 cards, interleaves native ads, and renders
 * a horizontal scroller. Each rail caches independently so flipping
 * chips only refetches the one the user actually selected.
 *
 * If the user has the same chip selected and `invalidateOnMount` is
 * true, we eagerly refetch — useful on the very first mount after
 * navigating back to the home, so the user sees fresh views.
 */
export function CategoryRail({
  category,
  limit = 10,
  onPress,
}: {
  category: SeriesCategory;
  limit?: number;
  onPress: (seriesId: string) => void;
}) {
  const { series, isLoading } = useFeed({ category });

  const cards: SeriesCardData[] = useMemo(
    () =>
      series.slice(0, limit).map((s) => ({
        id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url,
        episodes: s.episodes.length,
        coinsPerEpisode: s.episodes[0]?.coin_cost ?? 18,
        views: s.total_views,
      })),
    [series, limit],
  );

  const withAds = useMemo(
    () => injectNativeAds(cards, NATIVE_AD_FEED_INTERVAL, (c) => c.id),
    [cards],
  );

  const handlePress = useCallback(
    (id: string) => onPress(id),
    [onPress],
  );

  if (isLoading && cards.length === 0) {
    return null;
  }
  if (cards.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 4 }}
    >
      {withAds.map((entry) =>
        entry.kind === "ad" ? (
          <View key={entry.id} style={{ width: 86, marginRight: 8 }}>
            <NativeAdCard variant="grid" />
          </View>
        ) : (
          <VSeriesCard
            key={entry.id}
            series={entry.value}
            compact
            onPress={handlePress}
          />
        ),
      )}
    </ScrollView>
  );
}
