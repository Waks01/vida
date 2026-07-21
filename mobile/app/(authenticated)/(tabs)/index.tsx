import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { VWordmark } from "../../../src/shared/components/VWordmark";
import { VBadge } from "../../../src/shared/components/VBadge";
import {
  VSeriesCard,
  type SeriesCardData,
  posterGradientFor,
} from "../../../src/shared/components/VSeriesCard";
import { VShelfHeader } from "../../../src/shared/components/VShelfHeader";
import { VHeroCarousel, type HeroSlide } from "../../../src/shared/components/VHeroCarousel";
import { VWatchEarnGrid } from "../../../src/shared/components/VWatchEarnGrid";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useSmoothCarousel } from "../../../src/shared/hooks/useSmoothCarousel";
import { CategoryChipRow } from "../../../src/shared/components/CategoryChipRow";
import { CategoryRail } from "../../../src/shared/components/CategoryRail";
import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { useWatchHistory } from "../../../src/features/feed/hooks/useWatchHistory";
import { useWallet } from "../../../src/features/wallet/hooks/useWallet";
import { queryKeys } from "../../../src/core/api/queryClient";
import {
  FORM_CATEGORIES,
  TROPE_CATEGORIES,
  type SeriesCategory,
} from "../../../src/features/feed/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { Routes } from "../../../src/shared/constants/routes";

/**
 * Split a series title into a deliberate 2-line break, matching the design
 * ("The Heir's / Secret Bride"). Picks the first whitespace at the
 * half-word mark so long titles get a balanced break and short ones
 * stay on a single line. Pure formatting — no data is fabricated.
 */
function splitTitle(title: string): [string, string] {
  if (!title) return ["Featured", "Drama"];
  const words = title.split(" ");
  if (words.length <= 1) return [title, ""];
  const cut = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

/**
 * RN has no `-webkit-text-stroke`, so the Top 10 rank digit is faked with
 * four ink-colored Text siblings absolutely positioned in the four cardinal
 * offsets around the ember digit. The eye reads the four as a single ring.
 */
function RankDigit({ n }: { n: number }) {
  const { tokens } = useTheme();
  const ink = tokens["--vida-bg"];
  const digit = String(n).padStart(2, "0");
  const base = {
    position: "absolute" as const,
    zIndex: 5,
    fontFamily: "monospace" as const,
    fontWeight: "800" as const,
    fontSize: 36,
    lineHeight: 36,
  };
  const halo = (top: number, left: number) => ({ ...base, top, left, color: ink });
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: -4, left: -4, width: 40, height: 40 }}>
      <Text style={halo(0,  1.5)}>{digit}</Text>
      <Text style={halo(0, -1.5)}>{digit}</Text>
      <Text style={halo(1.5, 0)}>{digit}</Text>
      <Text style={halo(-1.5, 0)}>{digit}</Text>
      <Text style={{ ...base, top: 0, left: 0, color: tokens["--vida-accent"] }}>{digit}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { tokens } = useTheme();
  const qc = useQueryClient();
  const { series } = useFeed();
  const { balance } = useWallet();
  const safeBalance = typeof balance === "number" ? balance : 0;
  // Continue-Watching rail. `items` is the user's most-recently-watched
  // series in last-watched order. Empty array (and thus hidden shelf)
  // when the user has never watched anything.
  const { data: watchHistory = [] } = useWatchHistory(4);

  // Pull-to-refresh state. We invalidate every visible category query
  // plus the unfiltered feed, the resume rail, and the wallet — a
  // full-screen pull is meant to feel like "give me everything fresh".
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.seriesList() }),
        qc.invalidateQueries({ queryKey: ["series", "category"] }),
        qc.invalidateQueries({ queryKey: queryKeys.watchHistory(4) }),
        qc.invalidateQueries({ queryKey: queryKeys.wallet }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  // Section registry: every visible category rail and the rail's key.
  // Order matches the home (forms first, then tropes), so the scroll-to
  // shortcut in the chip rows lands in the right place.
  const allCategories: { key: SeriesCategory; label: string }[] = useMemo(
    () => [...FORM_CATEGORIES, ...TROPE_CATEGORIES],
    [],
  );

  // Outer ScrollView ref so chip shortcuts can scroll-to-section.
  const outerScrollRef = useRef<ScrollView>(null);
  // One ref per category section — `measure` gives us the node's
  // position in window coordinates; the ScrollView's own measure gives
  // us its offset, so subtraction lands at the right scroll-to y.
  const sectionRefs = useRef<Record<string, View | null>>({});
  const scrollToCategory = useCallback(
    (key: SeriesCategory) => {
      router.push({ pathname: Routes.category(key) as any, params: { key } });
    },
    [router],
  );

  // Hero slides — top 3 by views. The thumbnail is the dominant visual;
  // VHeroBanner uses its own default legibility mask so we don't pass a
  // per-slide brand gradient (those were hiding the real poster).
  const heroSlides: HeroSlide[] = useMemo(() => {
    const sorted = [...series].sort((a, b) => (b.total_views ?? 0) - (a.total_views ?? 0));
    return sorted.slice(0, 3).map((s, idx) => {
      const [title1, title2] = splitTitle(s.title);
      const views = (s.total_views ?? 0) / 1_000_000;
      const tag =
        idx === 0
          ? `EP 1 · ${s.episodes.length} EPS · ${s.category?.toUpperCase() ?? "NEW"}`
          : idx === 1
            ? `${views.toFixed(1)}M VIEWS · TRENDING`
            : `${s.episodes.length} EPS · ${s.category?.toUpperCase() ?? "EXCL"}`;
      return {
        id: s.id,
        tag,
        title1,
        title2,
        meta: `${views.toFixed(1)}M views · ${s.episodes[0]?.coin_cost ?? 25} ✦ to unlock`,
        thumbnail: s.thumbnail_url,
      };
    });
  }, [series]);

  // Resume rail — real watch history, in last-watched order. Each row
  // already carries the user's current episode + progress so we render
  // `wide` cards with a real progress bar overlay. The shelf is hidden
  // entirely when the user hasn't watched anything yet.
  const continueWatching: SeriesCardData[] = useMemo(
    () =>
      watchHistory.map((w) => {
        const totalSeconds = w.episode_duration_seconds ?? 0;
        const remainingSeconds = Math.max(
          0,
          Math.round(totalSeconds * (1 - Math.max(0, Math.min(1, w.progress)))),
        );
        return {
          id: w.series_id,
          title: w.series_title,
          thumbnail_url: w.series_thumbnail_url ?? "",
          // The CW meta line shows "EP N · M:SS LEFT". The backend
          // doesn't yet expose series episode count on the row, so we
          // surface the per-episode count we know about.
          episodes: 1,
          coinsPerEpisode: 0,
          progress: w.progress,
          currentEpisode: w.episode_number ?? 1,
          remainingSeconds,
          gradient: posterGradientFor(w.series_id),
        };
      }),
    [watchHistory],
  );

  // Top 10 — sorted by total views desc.
  const top10: SeriesCardData[] = useMemo(
    () =>
      [...series]
        .sort((a, b) => (b.total_views ?? 0) - (a.total_views ?? 0))
        .slice(0, 10)
        .map((s) => ({
          id: s.id,
          title: s.title,
          thumbnail_url: s.thumbnail_url,
          episodes: s.episodes.length,
          coinsPerEpisode: s.episodes[0]?.coin_cost ?? 25,
          views: s.total_views,
          gradient: posterGradientFor(s.id),
        })),
    [series],
  );

  // Resume rail autoplay — card width is 135 (5px wider than v1) + 8 gap.
  const resumeScrollRef = useRef<ScrollView>(null);
  const resumeCarousel = useSmoothCarousel({
    scrollRef: resumeScrollRef,
    itemCount: continueWatching.length,
    cardWidth: 143, // 135 card + 8 gap
  });

  const navigateToSeries = useCallback((id: string) => {
    router.push({ pathname: "/(authenticated)/series/[id]", params: { id } });
  }, []);

  const navigateToPlayer = useCallback((id: string) => {
    router.push({ pathname: "/(authenticated)/series/[id]", params: { id } });
  }, []);

  const navigateToSearch = useCallback(() => {
    router.push({ pathname: "/(authenticated)/(tabs)/search" });
  }, []);

  const navigateToNotifications = useCallback(() => {
    router.push("/(authenticated)/notifications" as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      {/* Sticky header — top bar, search, and category chips live ABOVE
          the scrolling content so they stay pinned at the top of the
          tab while the rest of the home scrolls. */}
      <View>
        {/* Top bar -------------------------------------------------------- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingTop: 20,
            paddingBottom: 10,
          }}
        >
          <VWordmark size={18} />
          <View style={{ flex: 1 }} />
          <VBadge coins={safeBalance} />
          <Pressable
            onPress={navigateToNotifications}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: tokens["--vida-surface-2"],
              borderWidth: 1,
              borderColor: tokens["--vida-border"],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <VIcon name="notifications-outline" size={14} color={tokens["--vida-text-primary"]} />
          </Pressable>
        </View>

        {/* Search bar — trimmed 2–3px shorter than the v1 design ---------- */}
        <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
          <Pressable
            onPress={navigateToSearch}
            accessibilityRole="button"
            accessibilityLabel="Search dramas, genres"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: tokens["--vida-surface-2"],
              borderWidth: 1,
              borderColor: tokens["--vida-border"],
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <VIcon name="search" size={14} color={tokens["--vida-text-dim"]} />
            <Text style={{ color: tokens["--vida-text-dim"], fontSize: 12 }}>
              Search tropes, titles…
            </Text>
          </Pressable>
        </View>

        {/* Category chip rows — fixed directly under the search input.
            Tapping a chip invalidates that category's query and scrolls
            to the matching rail below. */}
        <CategoryChipRow
          categories={FORM_CATEGORIES}
          activeKey={null}
          onChange={scrollToCategory}
        />
        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <CategoryChipRow
            categories={TROPE_CATEGORIES}
            activeKey={null}
            onChange={scrollToCategory}
          />
        </View>
      </View>

      {/* Scrolling content — everything from the hero down. Pull-to-refresh
          on this ScrollView only. */}
      <ScrollView
        ref={outerScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens["--vida-accent"]}
            colors={[tokens["--vida-accent"]]}
            progressBackgroundColor={tokens["--vida-surface-2"]}
          />
        }
      >
        {/* Featured hero carousel ---------------------------------------- */}
        {heroSlides.length > 0 ? (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <VHeroCarousel slides={heroSlides} onPlay={navigateToPlayer} />
          </View>
        ) : null}

        {/* Continue Watching --------------------------------------------- */}
        {continueWatching.length > 0 ? (
          <>
            <VShelfHeader eyebrow="Resume" />
            <ScrollView
              ref={resumeScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={resumeCarousel.onScroll}
              scrollEventThrottle={16}
              onTouchStart={resumeCarousel.handleTouchStart}
              onTouchEnd={resumeCarousel.handleTouchEnd}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 4 }}
            >
              {continueWatching.map((card) => (
                <VSeriesCard
                  key={card.id}
                  series={card}
                  wide
                  onPress={navigateToSeries}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Top 10 This week ---------------------------------------------- */}
        {top10.length > 0 ? (
          <>
            <VShelfHeader eyebrow="Top 10" title="This week" onSeeAllPress={navigateToSearch} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 4 }}
            >
              {top10.map((card, idx) => (
                <View key={card.id} style={{ position: "relative", marginRight: 8 }}>
                  <RankDigit n={idx + 1} />
                  <VSeriesCard series={card} compact onPress={navigateToSeries} />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* One rail per category — each fetches its own slice. */}
        {allCategories.map((c) => (
          <View
            key={c.key}
            ref={(node) => {
              sectionRefs.current[c.key] = node;
            }}
          >
            <VShelfHeader
              eyebrow="Browse"
              title={c.label}
              seeAllHref={`/(authenticated)/(tabs)/category/${c.key}`}
            />
            <CategoryRail category={c.key} limit={8} onPress={navigateToSeries} />
          </View>
        ))}

        {/* Watch & Earn -------------------------------------------------- */}
        <VShelfHeader eyebrow="Watch & earn" />
        <VWatchEarnGrid />
      </ScrollView>
    </View>
  );
}
