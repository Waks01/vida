import { FlatList, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { VSeriesCard, type SeriesCardData } from "../../../src/shared/components/VSeriesCard";
import { VBadge } from "../../../src/shared/components/VBadge";
import { VButton } from "../../../src/shared/components/VButton";
import { VIcon } from "../../../src/shared/components/VIcon";
import { NativeAdCard } from "../../../src/features/ads/components/NativeAdCard";
import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { useWallet } from "../../../src/features/wallet/hooks/useWallet";
import { useAdReward } from "../../../src/features/ads/hooks/useAdReward";
import { injectNativeAds } from "../../../src/features/feed/utils/injectNativeAds";
import { NATIVE_AD_FEED_INTERVAL } from "../../../src/features/ads/constants";
import { useTheme } from "../../../src/providers/ThemeProvider";

const GENRES = [
  { label: "Romance", color: "rgba(124, 58, 237, 0.2)", text: "#a78bfa" },
  { label: "Thriller", color: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  { label: "Werewolf", color: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
  { label: "CEO", color: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
];

export default function HomeScreen() {
  const { tokens } = useTheme();
  const { series, isLoading } = useFeed();
  const { balance, checkIn } = useWallet();
  const isPending = checkIn.isPending;
  useAdReward();

  const cards: SeriesCardData[] = series.map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail_url: s.thumbnail_url,
    episodes: s.episodes.length,
    coinsPerEpisode: s.episodes[0]?.coin_cost ?? 0,
  }));

  const trending = injectNativeAds(cards, NATIVE_AD_FEED_INTERVAL, (c) => c.id);

  const handleCheckIn = () => checkIn.mutate();

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      {/* Branded header + coin badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: tokens["--vida-primary"], fontSize: 24, fontWeight: "900", letterSpacing: 0.5 }}>
          Vida
        </Text>
        <View style={{ flex: 1 }} />
        <VBadge coins={balance} />
      </View>

      {/* Search bar */}
      <Pressable
        onPress={() => router.push({ pathname: "/(authenticated)/(tabs)/search" })}
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: tokens["--vida-surface-3"],
          borderWidth: 1,
          borderColor: tokens["--vida-border"],
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <VIcon name="search" color={tokens["--vida-text-dim"]} />
        <Text style={{ color: tokens["--vida-text-dim"], fontSize: 13 }}>Search dramas, genres...</Text>
      </Pressable>

      {/* Daily check-in banner */}
      <LinearGradient
        colors={["#5b21b6", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <VIcon name="gift" size={28} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Daily Check-in</Text>
          <Text style={{ color: "#c4b5fd", fontSize: 11, marginTop: 2 }}>Claim 100 coins daily</Text>
        </View>
        <VButton title="Claim" variant="coin" size="sm" loading={isPending} onPress={handleCheckIn} />
      </LinearGradient>

      {/* Trending Now */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 15, fontWeight: "700" }}>
          <VIcon name="flame" size={16} /> Trending Now
        </Text>
        <Text style={{ color: tokens["--vida-primary-light"], fontSize: 12 }}>See all</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={trending}
          keyExtractor={(entry) => entry.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 16 }}
          renderItem={({ item }) =>
            item.kind === "ad" ? (
              <View style={{ width: 140 }}>
                <NativeAdCard variant="grid" />
              </View>
            ) : (
              <VSeriesCard
                series={item.value}
                onPress={(id) => router.push({ pathname: "/(authenticated)/series/[id]", params: { id } })}
              />
            )
          }
        />
      )}

      {/* Browse Genres */}
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 }}>
        Browse Genres
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 24 }}>
        {GENRES.map((g) => (
          <Pressable
            key={g.label}
            style={{ backgroundColor: g.color, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 }}
            onPress={() => router.push({ pathname: "/(authenticated)/(tabs)/search" })}
          >
            <Text style={{ color: g.text, fontSize: 12, fontWeight: "700" }}>{g.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
