import { useCallback } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { VSwipePlayer } from "../../src/features/player/components/VSwipePlayer";
import { useFeed } from "../../src/features/feed/hooks/useFeed";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useWallet } from "../../src/features/wallet/hooks/useWallet";
import { httpClient } from "../../src/core/api/httpClient";
import { feedApi } from "../../src/features/feed/api/feedApi";
import { queryKeys } from "../../src/core/api/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import type { EpisodeSummary, SeriesSummary } from "../../src/features/feed/types";

export default function PlayerScreen() {
  const { tokens } = useTheme();
  const { series } = useFeed();
  const { refetch: refetchWallet } = useWallet();
  const qc = useQueryClient();
  // Accept both `seriesId` (open from the home) and `episodeId` (deep
  // link from the detail page). The deck opens at the matching
  // episode when `episodeId` is present.
  const { seriesId, episodeId } = useLocalSearchParams<{ seriesId?: string; episodeId?: string }>();

  const filteredSeries: SeriesSummary[] = seriesId
    ? series.filter((s) => s.id === seriesId)
    : series;

  // Resolve the starting index of the combined deck so the deep-linked
  // episode is the first item the user sees. Falls back to 0 when the
  // id isn't found (or the deck is empty).
  const initialIndex = (() => {
    if (!episodeId) return 0;
    const episodes = filteredSeries.flatMap((s) => s.episodes);
    const idx = episodes.findIndex((e) => e.id === episodeId);
    return idx >= 0 ? idx : 0;
  })();

  // Coins-path unlock. Returns true on success, false on failure
  // (e.g. insufficient balance, network error). The player only
  // dismisses the unlock sheet when this resolves true; if it
  // returns false the sheet stays up and the user can retry.
  const handleCoinsUnlock = useCallback(
    async (episode: EpisodeSummary): Promise<boolean> => {
      try {
        const { data } = await httpClient.post(
          `/content/episodes/${episode.id}/unlock`,
          { method: "coins" },
        );
        if (!data?.unlocked) return false;
        // Refresh the wallet so the new balance shows in the unlock
        // sheet, the top bar coin chip, and the wallet tab.
        await Promise.all([
          refetchWallet(),
          qc.invalidateQueries({ queryKey: queryKeys.coinHistory(1) }),
        ]);
        return true;
      } catch (e) {
        // Surface the backend's message (e.g. "Insufficient coins")
        // to the unlock sheet via the player.
        const detail =
          (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        throw new Error(detail ?? "Could not unlock this episode. Please try again.");
      }
    },
    [refetchWallet, qc],
  );

  // The player reports (episodeId, progress) for every visible
  // episode and every 15s heartbeat. We forward both to the backend
  // so the watch-history row stays current.
  const handleEpisodeView = useCallback((episodeIdLocal: string, progress: number) => {
    void feedApi.recordWatch(episodeIdLocal, progress);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VSwipePlayer
        series={filteredSeries}
        initialIndex={initialIndex}
        onCoinsUnlock={handleCoinsUnlock}
        onEpisodeView={handleEpisodeView}
        resolveUrl={feedApi.getStreamUrl}
      />
    </View>
  );
}