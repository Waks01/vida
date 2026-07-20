import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { VHeader } from "../../src/shared/components/VHeader";
import { VIcon } from "../../src/shared/components/VIcon";
import { useFeed } from "../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../src/providers/ThemeProvider";

interface WatchRow {
  id: string;
  title: string;
  episode: number;
  progress: number;
}

export default function WatchHistoryScreen() {
  const { tokens } = useTheme();
  const { series, isLoading } = useFeed();

  const rows: WatchRow[] = series.slice(0, 6).map((s, i) => ({
    id: s.id,
    title: s.title,
    episode: (i % Math.max(s.episodes.length, 1)) + 1,
    progress: [72, 40, 88, 15, 55, 33][i % 6] ?? 0,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VHeader title="Watch History" showBack />

      {isLoading ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/(authenticated)/series/[id]", params: { id: item.id } })}
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View
                style={{
                  width: 60,
                  height: 86,
                  borderRadius: 10,
                  backgroundColor: tokens["--vida-surface"],
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: tokens["--vida-primary"],
                  alignItems: "center",
                  justifyContent: "center",
                  }}
                >
                  <VIcon name="film" size={22} color="#fff" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "700" }} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12, marginTop: 4 }}>
                  Ep {item.episode} · {item.progress}% watched
                </Text>
                <View
                  style={{
                    marginTop: 6,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: tokens["--vida-border"],
                    overflow: "hidden",
                  }}
                >
                  <View style={{ height: "100%", width: `${item.progress}%`, backgroundColor: tokens["--vida-primary"] }} />                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 24 }}>
              No watch history yet
            </Text>
          }
        />
      )}
    </View>
  );
}
