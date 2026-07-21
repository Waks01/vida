import { Dimensions, FlatList, Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "../../../src/shared/components/VLinearGradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VIcon } from "../../../src/shared/components/VIcon";
import { VSaveButton } from "../../../src/shared/components/VSaveButton";
import { useSeries } from "../../../src/features/feed/hooks/useSeries";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { posterGradientFor } from "../../../src/shared/components/VSeriesCard";
import { formatDuration } from "../../../src/shared/utils/format";

/** Hero height: 16:11 ratio against screen width so the detail page
 * matches the home hero's framing. */
const HERO_RATIO = 11 / 16;

export default function SeriesDetail() {
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { series: s, isLoading } = useSeries(id);

  const heroHeight = Math.round(Dimensions.get("window").width * HERO_RATIO);

  if (isLoading || !s) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens["--vida-bg"],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
      </View>
    );
  }

  // The hero is either the real thumbnail or a per-series gradient
  // (no fake film icon, no fake emoji — the gradient is the fallback
  // identity and varies by series so two detail pages never look
  // identical).
  const heroGradient = posterGradientFor(s.id);

  // Badges: only category + episode count. The previous "NEW" pill
  // triggered on `status === "published"` which is every published
  // series, so it showed on every page; that's a placeholder
  // behavior, not a signal. Re-add recency once `created_at` drives
  // a real "new this week" flag.
  const badges: string[] = [`${s.episodes.length} eps`];
  if (s.category) badges.push(s.category.toUpperCase());

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <FlatList
        data={s.episodes}
        keyExtractor={(ep) => ep.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <View style={{ position: "relative", height: heroHeight }}>
              {s.thumbnail_url ? (
                <Image
                  source={{ uri: s.thumbnail_url }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                />
              )}
              {/* Bottom legibility mask — transparent at top so the
                back-button chrome stays against the poster, opaque
                at bottom so the title block below is readable. */}
              <LinearGradient
                colors={["transparent", tokens["--vida-bg"]]}
                start={{ x: 0, y: 0.4 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingTop: 16,
                }}
              >
                <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
                  <VIcon name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <View style={{ flex: 1 }} />
                <VIcon name="ellipsis-horizontal" size={22} color="#fff" />
              </View>
            </View>

            {/* Title + badges + description */}
            <View
              style={{
                paddingHorizontal: 16,
                marginTop: -40,
                position: "relative",
                zIndex: 2,
              }}
            >
              <Text
                style={{
                  color: tokens["--vida-text-primary"],
                  fontSize: 22,
                  fontWeight: "700",
                }}
              >
                {s.title}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {badges.map((label) => (
                  <View
                    key={label}
                    style={{
                      backgroundColor: "rgba(148, 163, 184, 0.1)",
                      borderRadius: 999,
                      paddingVertical: 3,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: tokens["--vida-text-muted"],
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              {s.description ? (
                <Text
                  style={{
                    color: tokens["--vida-text-muted"],
                    fontSize: 12,
                    marginTop: 10,
                    lineHeight: 18,
                  }}
                >
                  {s.description}
                </Text>
              ) : (
                <Text
                  style={{
                    color: tokens["--vida-text-dim"],
                    fontSize: 12,
                    marginTop: 10,
                    fontStyle: "italic",
                  }}
                >
                  No synopsis yet.
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <VButton
                    title="Start Watching"
                    fullWidth
                    onPress={() =>
                      router.push({
                        pathname: "/(authenticated)/player",
                        params: { seriesId: id, episodeId: s.episodes[0]?.id },
                      })
                    }
                  />
                </View>
                <VSaveButton seriesId={id} />
              </View>
            </View>

            <Text
              style={{
                color: tokens["--vida-text-muted"],
                fontSize: 13,
                fontWeight: "700",
                paddingHorizontal: 16,
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              EPISODES
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const locked = item.is_premium && item.coin_cost > 0;
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(authenticated)/player",
                  params: { seriesId: id, episodeId: item.id },
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: tokens["--vida-border"],
              }}
            >
              <VIcon
                name={locked ? "lock-closed" : "checkmark-circle"}
                size={20}
                color={locked ? tokens["--vida-text-dim"] : tokens["--vida-success"]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>
                  Ep {item.episode_number}: {item.title}
                </Text>
                <Text
                  style={{
                    color: tokens["--vida-text-dim"],
                    fontSize: 12,
                    marginTop: 2,
                    fontFamily: "monospace",
                  }}
                >
                  {formatDuration(item.duration_seconds)} · {locked ? `${item.coin_cost} ✦` : "Free"}
                </Text>
              </View>
              {locked ? (
                <VIcon name="lock-closed" size={16} color={tokens["--vida-text-dim"]} />
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
