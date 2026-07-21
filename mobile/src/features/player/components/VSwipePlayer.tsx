import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { NativeAdCard } from "../../ads/components/NativeAdCard";
import { NATIVE_AD_PLAYER_INTERVAL, NATIVE_AD_PLAYER_SESSION_CAP } from "../../ads/constants";
import { useAdReward } from "../../ads/hooks/useAdReward";
import { injectNativeAds } from "../../feed/utils/injectNativeAds";
import { VBadge } from "../../../shared/components/VBadge";
import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";
import { useWallet } from "../../wallet/hooks/useWallet";
import { feedApi } from "../../feed/api/feedApi";
import type { EpisodeSummary, SeriesSummary, StreamResolveResponse } from "../../feed/types";

import { VPlayerTopBar } from "./VPlayerTopBar";
import { VPlayerProgress } from "./VPlayerProgress";
import { VPlayerActionRow } from "./VPlayerActionRow";
import { VPlayerUnlockSheet } from "./VPlayerUnlockSheet";
import { VPlayerAdPill } from "./VPlayerAdPill";
import { VCommentSheet } from "./VCommentSheet";

interface SwipePlayerProps {
  series: SeriesSummary[];
  initialIndex?: number;
  onCoinsUnlock?: (episode: EpisodeSummary) => Promise<boolean>;
  onEpisodeView?: (episodeId: string, progress: number) => void;
  resolveUrl?: (episodeId: string) => Promise<StreamResolveResponse | null>;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const AD_REWARD_COINS = 20;

interface EpisodeCardProps {
  episode: EpisodeSummary;
  seriesEpisodeCount: number;
  seriesTitle: string;
  seriesId: string;
  isUnlocked: boolean;
  isActive: boolean;
  onUnlock: () => void;
  onCoinsUnlock: (episode: EpisodeSummary) => Promise<boolean>;
  onWatchHeartbeat: (episodeId: string, progress: number) => void;
  resolveUrl?: (episodeId: string) => Promise<StreamResolveResponse | null>;
  userBalance: number;
  pageHeight: number;
}

function YTEmbed({ videoId }: { videoId: string }) {
  if (typeof WebView === "undefined") {
    return (
      <View style={{ width: "100%", height: "100%", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff" }}>YouTube playback requires app rebuild</Text>
      </View>
    );
  }
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
    <iframe
      src="https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&modestbranding=1&rel=0"
      style="width:100%;height:100%;border:0"
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>
    </body>
    </html>
  `;
  return <WebView source={{ html }} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />;
}

function VimeoEmbed({ videoId }: { videoId: string }) {
  if (typeof WebView === "undefined") {
    return (
      <View style={{ width: "100%", height: "100%", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff" }}>Vimeo playback requires app rebuild</Text>
      </View>
    );
  }
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
    <iframe
      src="https://player.vimeo.com/video/${videoId}?playsinline=1&autoplay=1"
      style="width:100%;height:100%;border:0"
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>
    </body>
    </html>
  `;
  return <WebView source={{ html }} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />;
}

function EpisodeCard({
  episode,
  seriesEpisodeCount,
  seriesTitle,
  seriesId,
  isUnlocked,
  isActive,
  onUnlock,
  onCoinsUnlock,
  onWatchHeartbeat,
  resolveUrl,
  userBalance,
  pageHeight,
}: EpisodeCardProps) {
  const { tokens } = useTheme();
  const [stream, setStream] = useState<StreamResolveResponse | null>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [coinsBusy, setCoinsBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [attemptedAutoUnlock, setAttemptedAutoUnlock] = useState(false);
  const { watchAd, isLoading: isAdLoading } = useAdReward();

  const isHls = stream?.kind === "hls";
  const isYt = stream?.kind === "youtube";
  const isVm = stream?.kind === "vimeo";
  const hasContent = !!stream && stream.kind !== "unknown";
  const canHlsPlay = isHls && !!stream.hls_url;
  const safeBalance = typeof userBalance === "number" ? userBalance : 0;
  const isFree = !episode.is_premium || episode.coin_cost === 0;

  const hlsPlayer = useVideoPlayer(canHlsPlay ? (stream.hls_url ?? "") : "");

  useEffect(() => {
    setPlaying(false);
    setShowModal(false);
    setAttemptedAutoUnlock(false);
    setStream(null);
  }, [episode.id]);

  useEffect(() => {
    const sub = hlsPlayer.addListener("playingChange", ({ isPlaying: p }) => setPlaying(p));
    return () => sub.remove();
  }, [hlsPlayer]);

  useEffect(() => {
    let cancelled = false;
    feedApi
      .getEpisodeLike(episode.id)
      .then((r) => { if (!cancelled) setLiked(r.liked); })
      .catch(() => { if (!cancelled) setLiked(false); });
    return () => { cancelled = true; };
  }, [episode.id]);

  useEffect(() => {
    if (!isActive || !resolveUrl || stream) return;
    let cancelled = false;
    resolveUrl(episode.id)
      .then((r) => { if (!cancelled) setStream(r); })
      .catch(() => { if (!cancelled) setStream(null); });
    return () => { cancelled = true; };
  }, [isActive, resolveUrl, stream, episode.id]);

  const attemptPlay = useCallback(async () => {
    if (!hasContent) return;
    if (isUnlocked || isFree) {
      if (canHlsPlay) {
        if (playing) { hlsPlayer.pause(); } else { hlsPlayer.play(); }
      }
      return;
    }
    if (isFree) return;
    if (safeBalance >= episode.coin_cost && !attemptedAutoUnlock) {
      setAttemptedAutoUnlock(true);
      try {
        const ok = await onCoinsUnlock(episode);
        if (ok) {
          onUnlock();
          setShowModal(false);
          if (canHlsPlay) {
            hlsPlayer.play();
          }
        } else {
          setShowModal(true);
        }
      } catch {
        setShowModal(true);
      }
    } else if (!attemptedAutoUnlock) {
      setShowModal(true);
    }
  }, [isUnlocked, isFree, safeBalance, episode.coin_cost, onCoinsUnlock, onUnlock, canHlsPlay, hlsPlayer, playing, attemptedAutoUnlock, hasContent]);

  useEffect(() => {
    if (!isActive || !hasContent) return;
    if (isUnlocked || isFree) {
      if (isHls && canHlsPlay) {
        hlsPlayer.play();
      }
    } else if (!attemptedAutoUnlock && safeBalance >= episode.coin_cost) {
      attemptPlay();
    } else if (!attemptedAutoUnlock && safeBalance < episode.coin_cost && isActive) {
      setShowModal(true);
    }
  }, [hasContent, isUnlocked, isFree, isActive, attemptPlay, canHlsPlay, hlsPlayer, attemptedAutoUnlock, safeBalance, episode.coin_cost]);

  useEffect(() => {
    if (!canHlsPlay || !isUnlocked) return;
    const timer = setInterval(() => {
      const d = hlsPlayer.duration > 0 ? hlsPlayer.duration : episode.duration_seconds;
      const progress = d > 0 ? hlsPlayer.currentTime / d : 0;
      onWatchHeartbeat(episode.id, progress);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [canHlsPlay, isUnlocked, episode.id, episode.duration_seconds, onWatchHeartbeat, hlsPlayer]);

  const _handlePlayToggle = useCallback(() => {
    if (!canHlsPlay) return;
    if (playing) { hlsPlayer.pause(); } else { hlsPlayer.play(); }
  }, [canHlsPlay, playing, hlsPlayer]);

  const handleAreaTap = useCallback(async () => {
    if (!hasContent) return;
    await attemptPlay();
  }, [hasContent, attemptPlay]);

  const handleLikeToggle = useCallback(async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    try {
      if (next) {
        await feedApi.likeEpisode(episode.id);
      } else {
        await feedApi.unlikeEpisode(episode.id);
      }
    } catch {
      setLiked(!next);
    } finally {
      setLikeBusy(false);
    }
  }, [liked, likeBusy, episode.id]);

  const handleAdUnlock = useCallback(async () => {
    setUnlockError(null);
    const result = await watchAd();
    if (result) {
      onUnlock();
      setShowModal(false);
      if (canHlsPlay) {
        hlsPlayer.play();
      }
    } else {
      setUnlockError("Ad didn't complete. Please try again.");
    }
  }, [watchAd, onUnlock, canHlsPlay, hlsPlayer]);

  const handleCoinsUnlock = useCallback(async () => {
    setUnlockError(null);
    setCoinsBusy(true);
    try {
      const ok = await onCoinsUnlock(episode);
      if (ok) {
        onUnlock();
        setShowModal(false);
        if (canHlsPlay) {
          hlsPlayer.play();
        }
      } else {
        setUnlockError("Could not unlock this episode. Please try again.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not unlock this episode.";
      setUnlockError(msg);
    } finally {
      setCoinsBusy(false);
    }
  }, [onCoinsUnlock, episode, onUnlock, canHlsPlay, hlsPlayer]);

  const handleDismissModal = useCallback(() => {
    setShowModal(false);
    setUnlockError(null);
  }, []);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report this episode?",
      "We'll review this episode for content that violates our guidelines.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            console.warn("[report]", { episode_id: episode.id });
          },
        },
      ],
    );
  }, [episode.id]);

  if (!hasContent && isUnlocked) {
    return (
      <View style={{ height: pageHeight, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-muted"], marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  const showSheet = showModal && !isUnlocked;

  return (
    <View style={{ height: pageHeight, backgroundColor: "#000", overflow: "hidden" }}>
      {hasContent ? (
        <>
          {isHls && stream.hls_url ? (
            <VideoView
              player={hlsPlayer}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              nativeControls={false}
            />
          ) : isYt && stream.youtube_key ? (
            <YTEmbed videoId={stream.youtube_key} />
          ) : isVm && stream.vimeo_key ? (
            <VimeoEmbed videoId={stream.vimeo_key} />
          ) : (
            <View style={{ width: "100%", height: "100%", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: tokens["--vida-text-muted"] }}>No playable source</Text>
            </View>
          )}
          <Pressable onPress={handleAreaTap} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        </>
      ) : (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {episode.thumbnail_url ? (
            <Image
              source={{ uri: episode.thumbnail_url }}
              style={{ width: "100%", height: "100%", opacity: 0.55 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#1a0e2a" }} />
          )}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <VIcon name="lock-closed" size={64} color="rgba(255,255,255,0.85)" />
          </View>
        </View>
      )}

      <VPlayerTopBar
        episodeNumber={episode.episode_number}
        totalEpisodes={seriesEpisodeCount}
        onBack={() => router.back()}
        onReport={handleReport}
      />

      <VPlayerAdPill
        visible={!isUnlocked && !showSheet}
        adRewardCoins={AD_REWARD_COINS}
        isLoading={isAdLoading}
        onPress={handleAdUnlock}
      />

      {/* Bottom overlay */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 40,
          backgroundColor: "rgba(0,0,0,0.85)",
        }}
      >
        {isHls && isUnlocked ? (
          <VPlayerProgress player={hlsPlayer} fallbackDurationSeconds={episode.duration_seconds} />
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 16 }}>
          <Text
            style={{ color: "#fff", fontSize: 11, fontWeight: "600", maxWidth: 160 }}
            numberOfLines={1}
          >
            Ep {episode.episode_number} — {episode.title}
          </Text>
          {isFree ? (
            <View
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: tokens["--vida-success"], fontSize: 10, fontWeight: "700" }}>FREE</Text>
            </View>
          ) : (
            <VBadge coins={episode.coin_cost} />
          )}
        </View>

        {isUnlocked ? (
          <View style={{ paddingBottom: 24 }}>
            <VPlayerActionRow
              seriesTitle={seriesTitle}
              seriesId={seriesId}
              episodeId={episode.id}
              episodeNumber={episode.episode_number}
              liked={liked}
              onLikeToggle={handleLikeToggle}
              onCommentPress={() => setCommentsOpen(true)}
            />
          </View>
        ) : null}
      </View>

      <VPlayerUnlockSheet
        visible={showSheet && !isUnlocked}
        coinCost={episode.coin_cost}
        userBalance={safeBalance}
        adRewardCoins={AD_REWARD_COINS}
        isAdLoading={isAdLoading}
        isCoinsBusy={coinsBusy}
        errorMessage={unlockError}
        onWatchAd={handleAdUnlock}
        onUseCoins={handleCoinsUnlock}
        onDismiss={handleDismissModal}
      />

      <VCommentSheet
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        episodeNumber={episode.episode_number}
        seriesTitle={seriesTitle}
      />
    </View>
  );
}

export function VSwipePlayer({ series, initialIndex = 0, onCoinsUnlock, onEpisodeView, resolveUrl }: SwipePlayerProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { balance } = useWallet();
  const safeBalance = typeof balance === "number" ? balance : 0;
  const episodes = useMemo(() => series.flatMap((s) => s.episodes), [series]);
  const totalEpisodes = useMemo(
    () => series.reduce((acc, s) => acc + s.episodes.length, 0),
    [series],
  );
  const seriesTitle = series[0]?.title ?? "Vida";
  const seriesIdByEpisode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of series) for (const e of s.episodes) m.set(e.id, s.id);
    return m;
  }, [series]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [pageHeight, setPageHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const deck = useMemo(() => {
    const injected = injectNativeAds(episodes, NATIVE_AD_PLAYER_INTERVAL, (e) => e.id);
    if (injected.filter((x) => x.kind === "ad").length <= NATIVE_AD_PLAYER_SESSION_CAP) {
      return injected;
    }
    let ads = 0;
    return injected.filter((x) => {
      if (x.kind === "ad") { ads += 1; return ads <= NATIVE_AD_PLAYER_SESSION_CAP; }
      return true;
    });
  }, [episodes]);

  const handleUnlock = useCallback((ep: EpisodeSummary) => {
    setUnlocked((prev) => new Set(prev).add(ep.id));
  }, []);

  const handleCoinsUnlockLocal = useCallback(
    async (ep: EpisodeSummary): Promise<boolean> => {
      if (!onCoinsUnlock) {
        setUnlocked((prev) => new Set(prev).add(ep.id));
        return true;
      }
      return onCoinsUnlock(ep);
    },
    [onCoinsUnlock],
  );

  const handleHeartbeat = useCallback(
    (episodeId: string, progress: number) => {
      onEpisodeView?.(episodeId, progress);
    },
    [onEpisodeView],
  );

  const lastReportedIndexRef = useRef<number>(-1);
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageHeight <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / pageHeight);
      if (idx === lastReportedIndexRef.current) return;
      lastReportedIndexRef.current = idx;
      setCurrentIndex(idx);
      const item = deck[idx];
      if (item && item.kind === "item") {
        onEpisodeView?.(item.value.id, 0);
      }
    },
    [pageHeight, deck, onEpisodeView],
  );

  useEffect(() => {
    if (pageHeight <= 0 || initialIndex <= 0) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: pageHeight * initialIndex, animated: false });
      lastReportedIndexRef.current = initialIndex;
      setCurrentIndex(initialIndex);
      const item = deck[initialIndex];
      if (item && item.kind === "item") {
        onEpisodeView?.(item.value.id, 0);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [pageHeight, initialIndex, deck, onEpisodeView]);

  if (episodes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens["--vida-bg"],
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: insets.bottom,
        }}
      >
        <ActivityIndicator color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-muted"], marginTop: 12 }}>Loading dramas…</Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#000" }}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && h !== pageHeight) setPageHeight(h);
      }}
    >
      {pageHeight > 0 ? (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={pageHeight}
          snapToAlignment="start"
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEnabled={currentIndex >= 0}
        >
          {deck.map((item, idx) =>
            item.kind === "ad" ? (
              <View key={item.id} style={{ height: pageHeight }}>
                <NativeAdCard variant="full" />
              </View>
            ) : (
              <EpisodeCard
                key={item.value.id}
                episode={item.value}
                seriesEpisodeCount={totalEpisodes}
                seriesTitle={seriesTitle}
                seriesId={seriesIdByEpisode.get(item.value.id) ?? ""}
                isUnlocked={!item.value.is_premium || unlocked.has(item.value.id)}
                onUnlock={() => handleUnlock(item.value)}
                onCoinsUnlock={handleCoinsUnlockLocal}
                onWatchHeartbeat={handleHeartbeat}
                resolveUrl={resolveUrl}
                userBalance={safeBalance}
                pageHeight={pageHeight}
                isActive={idx === currentIndex}
              />
            ),
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
