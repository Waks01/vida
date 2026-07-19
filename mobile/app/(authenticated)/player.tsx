import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { VSwipePlayer } from "../../src/features/player/components/VSwipePlayer";
import { useFeed } from "../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../src/providers/ThemeProvider";
import { httpClient } from "../../src/core/api/httpClient";
import { feedApi } from "../../src/features/feed/api/feedApi";
import type { EpisodeSummary } from "../../src/features/feed/types";

export default function PlayerScreen() {
  const { tokens } = useTheme();
  const { series } = useFeed();
  const { seriesId } = useLocalSearchParams<{ seriesId?: string }>();

  const filteredSeries = seriesId
    ? series.filter((s) => s.id === seriesId)
    : series;

  async function handleUnlock(episode: EpisodeSummary) {
    try {
      await httpClient.post(`/content/episodes/${episode.id}/unlock`, { method: "coins" });
    } catch {
      // Unlock failure handled silently; UI reflects state on success.
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VSwipePlayer
        series={filteredSeries}
        onUnlockNeeded={handleUnlock}
        onEpisodeView={feedApi.recordWatch}
        resolveUrl={feedApi.getStreamUrl}
      />
    </View>
  );
}
