import { Image, Pressable, Text, View } from "react-native";

import { formatCoins } from "../utils/format";
import { useTheme } from "../../providers/ThemeProvider";

export interface SeriesCardData {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  episodes: number;
  coinsPerEpisode: number;
}

/** Series thumbnail card used in Home/Search grids. vida-design.html §2. */
export function VSeriesCard({
  series,
  onPress,
}: {
  series: SeriesCardData;
  onPress: (id: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={() => onPress(series.id)} style={{ width: "48%", marginBottom: 14 }}>
      <View
        style={{
          aspectRatio: 9 / 16,
          borderRadius: 14,
          backgroundColor: tokens["--vida-surface"],
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tokens["--vida-border"],
        }}
      >
        {series.thumbnail_url ? (
          <Image
            source={{ uri: series.thumbnail_url }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
            ✦ {formatCoins(series.coinsPerEpisode)}
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{ color: tokens["--vida-text-primary"], marginTop: 6, fontSize: 13, fontWeight: "600" }}
      >
        {series.title}
      </Text>
      <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11 }}>
        {series.episodes} eps
      </Text>
    </Pressable>
  );
}
