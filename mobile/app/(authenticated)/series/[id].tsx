import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function SeriesDetail() {
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { series } = useFeed();
  const [saved, setSaved] = useState(false);

  const s = series.find((x) => x.id === id);

  if (!s) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
      </View>
    );
  }

  const badges: { label: string; tone: "new" | "muted" }[] = [];
  if (s.status === "published") badges.push({ label: "NEW", tone: "new" });
  badges.push({ label: `${s.episodes.length} eps`, tone: "muted" });
  if (s.status && s.status !== "published") badges.push({ label: s.status, tone: "muted" });

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <FlatList
        data={s.episodes}
        keyExtractor={(ep) => ep.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <View style={{ position: "relative", height: 240 }}>
              <LinearGradient
                colors={["#7c3aed", "#1e1b4b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}
              >
                <VIcon name="film" size={64} color="rgba(255,255,255,0.85)" />
              </LinearGradient>
              <LinearGradient
                colors={[tokens["--vida-bg"], "transparent"]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
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
                <Pressable onPress={() => router.back()} hitSlop={8}>
                  <VIcon name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <View style={{ flex: 1 }} />
                <VIcon name="ellipsis-horizontal" size={22} color="#fff" />
              </View>
            </View>

            {/* Title + badges + description */}
            <View style={{ paddingHorizontal: 16, marginTop: -40, position: "relative", zIndex: 2 }}>
              <Text style={{ color: tokens["--vida-text-primary"], fontSize: 20, fontWeight: 800 }}>{s.title}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {badges.map((b) => (
                  <View
                    key={b.label}
                    style={{
                      backgroundColor: b.tone === "new" ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.1)",
                      borderRadius: 999,
                      paddingVertical: 3,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: b.tone === "new" ? tokens["--vida-success"] : tokens["--vida-text-muted"],
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {b.label}
                    </Text>
                  </View>
                ))}
              </View>
              {s.description ? (
                <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12, marginTop: 10, lineHeight: 18 }}>
                  {s.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <VButton
                    title="Start Watching"
                    fullWidth
                    onPress={() => router.push({ pathname: "/(authenticated)/player", params: { seriesId: id } })}
                  />
                </View>
                <VButton
                  title={saved ? "✓" : "＋"}
                  variant="ghost"
                  onPress={() => setSaved((v) => !v)}
                />
              </View>
            </View>

            <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, fontWeight: "700", paddingHorizontal: 16, marginTop: 24, marginBottom: 8 }}>
              EPISODES
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const locked = item.is_premium;
          return (
            <Pressable
              onPress={() => router.push({ pathname: "/(authenticated)/player", params: { seriesId: id } })}
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
                <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12, marginTop: 2 }}>
                  {Math.round(item.duration_seconds)}s · {locked ? `${item.coin_cost} ✦` : "Free"}
                </Text>
              </View>
              {locked ? <VIcon name="lock-closed" size={16} color={tokens["--vida-text-dim"]} /> : null}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ padding: 16, paddingTop: 8 }}>
            <VButton
              title="Play series"
              fullWidth
              onPress={() => router.push({ pathname: "/(authenticated)/player", params: { seriesId: id } })}
            />
            {saved ? <Text style={{ color: tokens["--vida-success"], textAlign: "center", marginTop: 8, fontSize: 12 }}>Saved to My List</Text> : null}
          </View>
        }
      />
    </View>
  );
}
