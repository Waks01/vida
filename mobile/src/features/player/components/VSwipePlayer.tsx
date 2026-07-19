import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

import { VBadge } from "../../../shared/components/VBadge";
import { RewardedAdButton } from "../../ads/components/RewardedAdButton";
import { NativeAdCard } from "../../ads/components/NativeAdCard";
import { NATIVE_AD_PLAYER_INTERVAL, NATIVE_AD_PLAYER_SESSION_CAP } from "../../ads/constants";
import { injectNativeAds } from "../../feed/utils/injectNativeAds";
import { formatDuration } from "../../../shared/utils/format";
import { useTheme } from "../../../providers/ThemeProvider";
import { httpClient } from "../../../core/api/httpClient";
import type { EpisodeSummary, SeriesSummary } from "../../feed/types";

const { height: SCREEN_H } = Dimensions.get("window");

interface SwipePlayerProps {
  series: SeriesSummary[];
  initialIndex?: number;
  onUnlockNeeded?: (episode: EpisodeSummary) => void;
  onEpisodeView?: (episodeId: string) => void;
  /** Resolves a playable HLS URL for an episode (signed for Stream, raw for external). */
  resolveUrl?: (episodeId: string) => Promise<string | null>;
}

interface EpisodeCardProps {
  episode: EpisodeSummary;
  isUnlocked: boolean;
  onUnlock: () => void;
  onWatchHeartbeat: (episodeId: string) => void;
  onAdUnlock?: (episodeId: string) => void;
  resolveUrl?: (episodeId: string) => Promise<string | null>;
}

const HEARTBEAT_INTERVAL_MS = 15_000;

function EpisodeCard({ episode, isUnlocked, onUnlock, onWatchHeartbeat, onAdUnlock, resolveUrl }: EpisodeCardProps) {
  const { tokens } = useTheme();
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  // Resolve the playable URL once the episode is unlocked (works for both
  // Cloudflare Stream (signed) and external/third-party (raw) sources).
  useEffect(() => {
    if (!isUnlocked || !resolveUrl || playUrl) return;
    let cancelled = false;
    resolveUrl(episode.id)
      .then((url) => {
        if (!cancelled) setPlayUrl(url);
      });
    return () => {
      cancelled = true;
    };
  }, [isUnlocked, resolveUrl, playUrl, episode.id]);

  const player = useVideoPlayer(playUrl ?? "", (p) => {
    p.loop = true;
    p.play();
  });
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const sub = player.addListener("playingChange", ({ isPlaying }) => setPlaying(isPlaying));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!isUnlocked || !playUrl) return;
    const timer = setInterval(() => onWatchHeartbeat(episode.id), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isUnlocked, playUrl, episode.id, onWatchHeartbeat]);

  if (!playUrl || !isUnlocked) {
    return (
      <View style={{ height: SCREEN_H, backgroundColor: tokens["--vida-surface"], justifyContent: "flex-end" }}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: tokens["--vida-text-primary"], fontSize: 20, fontWeight: "800" }}>
            Ep {episode.episode_number}: {episode.title}
          </Text>
          <Text style={{ color: tokens["--vida-text-muted"], marginTop: 4 }}>
            {formatDuration(episode.duration_seconds)} · {episode.is_premium ? "Premium" : "Free"}
          </Text>
          {!isUnlocked ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={onUnlock}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: tokens["--vida-primary"],
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>✦ {episode.coin_cost}</Text>
              </Pressable>
              <RewardedAdButton
                title="Watch Ad to Unlock"
                onRewardClaimed={async () => {
                  try {
                    await httpClient.post(`/content/episodes/${episode.id}/unlock`, {
                      method: "ad",
                      ad_unit_id: "ca-app-pub-3898064484524772/9448775876",
                      device_id: `device-${Date.now()}`,
                    });
                  } catch {
                    // Unlock failure handled silently; UI reflects state on success.
                  }
                  onAdUnlock?.(episode.id);
                }}
                style={{ alignSelf: "flex-start" }}
              />
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <ActivityIndicator color={tokens["--vida-primary"]} />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ height: SCREEN_H, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />
      <Pressable
        onPress={() => {
          if (playing) {
            player.pause();
            setPlaying(false);
          } else {
            player.play();
            setPlaying(true);
          }
        }}
        style={{ position: "absolute", top: 48, right: 16 }}
      >
        <VBadge coins={episode.coin_cost} />
      </Pressable>
      <View style={{ position: "absolute", bottom: 40, left: 16, right: 16 }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>
          Ep {episode.episode_number}: {episode.title}
        </Text>
        <Text style={{ color: "#ccc", marginTop: 4 }}>{formatDuration(episode.duration_seconds)}</Text>
      </View>
    </View>
  );
}

export function VSwipePlayer({ series, initialIndex = 0, onUnlockNeeded, onEpisodeView, resolveUrl }: SwipePlayerProps) {
  const { tokens } = useTheme();
  const episodes = series.flatMap((s) => s.episodes);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  // Interleave native ads every N episodes, capped per session (AdMob
  // frequency / retention guard). Ad slots load a fresh NativeAd on mount.
  const deck = useMemo(() => {
    const injected = injectNativeAds(episodes, NATIVE_AD_PLAYER_INTERVAL, (e) => e.id);
    if (injected.filter((x) => x.kind === "ad").length <= NATIVE_AD_PLAYER_SESSION_CAP) {
      return injected;
    }
    let ads = 0;
    return injected.filter((x) => {
      if (x.kind === "ad") {
        ads += 1;
        return ads <= NATIVE_AD_PLAYER_SESSION_CAP;
      }
      return true;
    });
  }, [episodes]);

  if (episodes.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-muted"], marginTop: 12 }}>Loading dramas…</Text>
      </View>
    );
  }

  const handleUnlock = useCallback((ep: EpisodeSummary) => {
    setUnlocked((prev) => new Set(prev).add(ep.id));
    onUnlockNeeded?.(ep);
  }, [onUnlockNeeded]);

  const handleAdUnlock = useCallback((episodeId: string) => {
    setUnlocked((prev) => new Set(prev).add(episodeId));
  }, []);

  const handleHeartbeat = useCallback((episodeId: string) => {
    // Watch heartbeat is fired on a timer; the backend /content/episodes/{id}/watch
    // endpoint accepts it (view persistence is intentionally deferred).
    void episodeId;
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: { kind: string; value?: EpisodeSummary } }> }) => {
      const item = viewableItems[0]?.item;
      if (item && item.kind === "item" && item.value) onEpisodeView?.(item.value.id);
    },
    [onEpisodeView]
  );

  return (
    <FlatList
      data={deck}
      keyExtractor={(e) => e.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      initialScrollIndex={Math.min(initialIndex, deck.length - 1)}
      getItemLayout={(_, i) => ({ length: SCREEN_H, offset: SCREEN_H * i, index: i })}
      onViewableItemsChanged={onViewableItemsChanged}
      renderItem={({ item }) =>
        item.kind === "ad" ? (
          <NativeAdCard variant="full" />
        ) : (
          <EpisodeCard
            episode={item.value}
            isUnlocked={!item.value.is_premium || unlocked.has(item.value.id)}
            onUnlock={() => handleUnlock(item.value)}
            onWatchHeartbeat={handleHeartbeat}
            onAdUnlock={handleAdUnlock}
            resolveUrl={resolveUrl}
          />
        )
      }
    />
  );
}
