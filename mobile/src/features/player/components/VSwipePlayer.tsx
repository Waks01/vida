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
import type { EpisodeSummary, SeriesSummary } from "../../feed/types";

import { VPlayerTopBar } from "./VPlayerTopBar";
import { VPlayerProgress } from "./VPlayerProgress";
import { VPlayerActionRow } from "./VPlayerActionRow";
import { VPlayerUnlockSheet } from "./VPlayerUnlockSheet";
import { VPlayerAdPill } from "./VPlayerAdPill";
import { VCommentSheet } from "./VCommentSheet";

interface SwipePlayerProps {
  series: SeriesSummary[];
  initialIndex?: number;
  /**
   * Coins-path unlock. Resolves to `true` when the backend confirms
   * the episode is unlocked; throws when the request fails (e.g.
   * insufficient balance). The player surfaces the error in the
   * unlock sheet so the user sees *why* it didn't work.
   */
  onCoinsUnlock?: (episode: EpisodeSummary) => Promise<boolean>;
  /**
   * Called when an episode comes into view (and every 15s thereafter
   * while it's playing). The progress arg is 0..1 within the current
   * episode — the parent writes it to the backend via
   * `feedApi.recordWatch(episodeId, progress)`.
   */
  onEpisodeView?: (episodeId: string, progress: number) => void;
  resolveUrl?: (episodeId: string) => Promise<string | null>;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const AD_REWARD_COINS = 20;

interface EpisodeCardProps {
  episode: EpisodeSummary;
  seriesEpisodeCount: number;
  seriesTitle: string;
  seriesId: string;
  isUnlocked: boolean;
  dismissed: boolean;
  onUnlock: () => void;
  onCoinsUnlock: (episode: EpisodeSummary) => Promise<boolean>;
  onDismiss: () => void;
  onWatchHeartbeat: (episodeId: string, progress: number) => void;
  resolveUrl?: (episodeId: string) => Promise<string | null>;
  /** Real page height (FlatList container, not window). */
  pageHeight: number;
}

function EpisodeCard({
  episode,
  seriesEpisodeCount,
  seriesTitle,
  seriesId,
  isUnlocked,
  dismissed,
  onUnlock,
  onCoinsUnlock,
  onDismiss,
  onWatchHeartbeat,
  resolveUrl,
  pageHeight,
}: EpisodeCardProps) {
  const { tokens } = useTheme();
  const { balance } = useWallet();
  const safeBalance = typeof balance === "number" ? balance : 0;
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [coinsBusy, setCoinsBusy] = useState(false);
  const { watchAd, isLoading: isAdLoading } = useAdReward();

  // Show the unlock sheet on first visit when locked and not yet dismissed.
  const [showSheet, setShowSheet] = useState(!isUnlocked && !dismissed);

  // Read the current like state on mount (and re-read when the
  // episode changes). The user expects the heart to be filled in if
  // they already liked the episode on a previous visit.
  useEffect(() => {
    let cancelled = false;
    feedApi
      .getEpisodeLike(episode.id)
      .then((r) => { if (!cancelled) setLiked(r.liked); })
      .catch(() => { if (!cancelled) setLiked(false); });
    return () => { cancelled = true; };
  }, [episode.id]);

  useEffect(() => {
    if (!isUnlocked || !resolveUrl || playUrl) return;
    let cancelled = false;
    resolveUrl(episode.id)
      .then((url) => { if (!cancelled) setPlayUrl(url); })
      .catch(() => { if (!cancelled) setPlayUrl(null); });
    return () => { cancelled = true; };
  }, [isUnlocked, resolveUrl, playUrl, episode.id]);

  const player = useVideoPlayer(playUrl ?? "", (p) => {
    p.loop = true;
  });

  useEffect(() => {
    const sub = player.addListener("playingChange", ({ isPlaying }) => setPlaying(isPlaying));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!isUnlocked || !playUrl) return;
    const timer = setInterval(() => {
      const d = player.duration > 0 ? player.duration : episode.duration_seconds;
      const progress = d > 0 ? player.currentTime / d : 0;
      onWatchHeartbeat(episode.id, progress);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isUnlocked, playUrl, episode.id, episode.duration_seconds, onWatchHeartbeat, player]);

  const handlePlayToggle = () => {
    if (playing) { player.pause(); } else { player.play(); }
  };

  const handleLikeToggle = useCallback(async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic flip; revert on failure.
    const next = !liked;
    setLiked(next);
    try {
      if (next) {
        await feedApi.likeEpisode(episode.id);
      } else {
        await feedApi.unlikeEpisode(episode.id);
      }
    } catch {
      // Revert the optimistic flip; surface no toast because likes
      // are not critical and the heart icon going back is its own
      // feedback.
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
      setShowSheet(false);
    } else {
      setUnlockError("Ad didn't complete. Please try again.");
    }
  }, [watchAd, onUnlock]);

  const handleCoinsUnlock = useCallback(async () => {
    setUnlockError(null);
    setCoinsBusy(true);
    try {
      const ok = await onCoinsUnlock(episode);
      if (ok) {
        onUnlock();
        setShowSheet(false);
      } else {
        setUnlockError("Could not unlock this episode. Please try again.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not unlock this episode.";
      setUnlockError(msg);
    } finally {
      setCoinsBusy(false);
    }
  }, [onCoinsUnlock, episode, onUnlock]);

  const handleDismiss = useCallback(() => {
    setShowSheet(false);
    setUnlockError(null);
    onDismiss();
  }, [onDismiss]);

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
            // Best-effort log so the user sees the action registered.
            // A real report endpoint is intentionally not in scope here
            // — the team curates content via Cloudflare Stream meta
            // and the admin tool, not user reports.
            console.warn("[report]", { episode_id: episode.id });
          },
        },
      ],
    );
  }, [episode.id]);

  if (!playUrl && isUnlocked) {
    return (
      <View style={{ height: pageHeight, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-muted"], marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  const isFree = !episode.is_premium || episode.coin_cost === 0;

  return (
    <View style={{ height: pageHeight, backgroundColor: "#000", overflow: "hidden" }}>
      {/* Video or locked placeholder */}
      {playUrl && isUnlocked ? (
        <VideoView
          player={player}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          nativeControls={false}
        />
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

      {/* Play/pause hit area. Uses `onStartShouldSetResponder`
          returning `false` so the gesture system never claims the
          touch — the parent ScrollView always gets the pan gesture
          and can complete its swipe. We still register `onResponderRelease`
          so a *tap* (no movement) is detected and counted as a play
          toggle. The 8px movement threshold filters accidental
          movement from a long-press. */}
      {!showSheet ? (
        <View
          onStartShouldSetResponder={() => false}
          onMoveShouldSetResponder={() => false}
          onResponderTerminationRequest={() => true}
          onStartShouldSetResponderCapture={() => false}
          style={{
            position: "absolute",
            top: 80,
            bottom: 180,
            left: 0,
            right: 0,
          }}
        >
          <Pressable
            onPress={handlePlayToggle}
            hitSlop={4}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {/* Big play indicator when paused */}
      {!showSheet && isUnlocked && !playing ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <VIcon name="play" size={36} color="#fff" />
          </View>
        </View>
      ) : null}

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
        {playUrl && isUnlocked ? (
          <VPlayerProgress player={player} fallbackDurationSeconds={episode.duration_seconds} />
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
        onDismiss={handleDismiss}
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
  const episodes = useMemo(() => series.flatMap((s) => s.episodes), [series]);
  const totalEpisodes = useMemo(
    () => series.reduce((acc, s) => acc + s.episodes.length, 0),
    [series],
  );
  // Title of the series for the action row share text.
  const seriesTitle = series[0]?.title ?? "Vida";
  // Map episode.id -> owning seriesId. Used for share deep-links
  // (`https://vida.app/s/{seriesId}/e/{episodeId}`) and for any
  // future per-episode navigation that needs the parent series.
  const seriesIdByEpisode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of series) for (const e of s.episodes) m.set(e.id, s.id);
    return m;
  }, [series]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
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
        // No backend handler — fall back to optimistic unlock.
        setUnlocked((prev) => new Set(prev).add(ep.id));
        return true;
      }
      return onCoinsUnlock(ep);
    },
    [onCoinsUnlock],
  );

  const handleDismiss = useCallback((episodeId: string) => {
    setDismissed((prev) => new Set(prev).add(episodeId));
  }, []);

  const handleHeartbeat = useCallback(
    (episodeId: string, progress: number) => {
      onEpisodeView?.(episodeId, progress);
    },
    [onEpisodeView],
  );

  // Track which page is currently visible. We use this to fire the
  // initial view-heartbeat once per page.
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

  // After the page height is measured AND the initial index is past 0,
  // scroll to it. We have to wait for the layout pass to complete or
  // the ScrollView's contentSize is still 0 and the scroll is a no-op.
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
          // Each deck item is exactly `pageHeight` tall, so snapping
          // to `pageHeight` intervals gives a TikTok-style swiped-up
          // page change.
          snapToInterval={pageHeight}
          snapToAlignment="start"
          onMomentumScrollEnd={onMomentumScrollEnd}
          // Disable scroll while the unlock sheet is on the active
          // card so the user can't swipe past a paywall by mistake.
          // The sheet has a tap-to-dismiss scrim that re-enables it.
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
                dismissed={dismissed.has(item.value.id)}
                onUnlock={() => handleUnlock(item.value)}
                onCoinsUnlock={handleCoinsUnlockLocal}
                onDismiss={() => handleDismiss(item.value.id)}
                onWatchHeartbeat={handleHeartbeat}
                resolveUrl={resolveUrl}
                pageHeight={pageHeight}
              />
            ),
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
