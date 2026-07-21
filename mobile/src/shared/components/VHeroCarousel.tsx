import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { VHeroBanner } from "./VHeroBanner";
import { useTheme } from "../../providers/ThemeProvider";

export interface HeroSlide {
  id: string;
  tag: string;
  title1: string;
  title2: string;
  meta: string;
  /** Optional legibility-mask gradient. Falls back to VHeroBanner's
   *  default transparent-to-ink mask — callers should usually omit this
   *  so the real series thumbnail stays the dominant visual. */
  gradient?: string[];
  thumbnail?: string;
}

/**
 * Full-bleed paginated hero carousel. Auto-advances every 5s; pauses the
 * instant the user touches it and resumes 5s after they let go. Dot
 * indicators below are tappable.
 *
 * Width model:
 * - The outer `<View>` measures itself via `onLayout`. That width is the
 *   device's usable width (the ScrollView fills its parent).
 * - Each slide wrapper is given that exact width so the ScrollView pages
 *   cleanly and the banner (which has `aspectRatio: 16/11`) gets a real
 *   number to size against.
 * - The banner keeps its `marginHorizontal: 14`, so the slide width is
 *   reused as the page stride, and the visible banner is `width - 28`.
 */
export function VHeroCarousel({
  slides,
  onPlay,
  autoplayMs = 5000,
}: {
  slides: HeroSlide[];
  onPlay: (id: string) => void;
  autoplayMs?: number;
}) {
  const { tokens } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserInteracting = useRef(false);

  const clearResume = useCallback(() => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearResume();
    if (isUserInteracting.current || slides.length <= 1) return;
    resumeTimer.current = setTimeout(() => {
      setActiveIndex((cur) => {
        const next = (cur + 1) % slides.length;
        if (scrollRef.current && slideWidth > 0) {
          scrollRef.current.scrollTo({ x: next * slideWidth, animated: true });
        }
        return next;
      });
    }, autoplayMs);
  }, [autoplayMs, clearResume, slideWidth, slides.length]);

  // Re-arm the autoplay whenever the active slide changes or the slide
  // width becomes known. Cleanup clears the pending timer.
  useEffect(() => {
    scheduleNext();
    return clearResume;
  }, [activeIndex, scheduleNext, clearResume]);

  useEffect(() => () => clearResume(), [clearResume]);

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      isUserInteracting.current = false;
      if (slideWidth > 0) {
        const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
        if (idx !== activeIndex) setActiveIndex(idx);
      }
      scheduleNext();
    },
    [activeIndex, scheduleNext, slideWidth],
  );

  const handleScrollBegin = useCallback(() => {
    isUserInteracting.current = true;
    clearResume();
  }, [clearResume]);

  const handleDotPress = useCallback(
    (idx: number) => {
      if (scrollRef.current && slideWidth > 0) {
        scrollRef.current.scrollTo({ x: idx * slideWidth, animated: true });
      }
      setActiveIndex(idx);
      scheduleNext();
    },
    [scheduleNext, slideWidth],
  );

  if (slides.length === 0) return null;

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== slideWidth) setSlideWidth(w);
      }}
    >
      {slideWidth > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onTouchEnd={scheduleNext}
          scrollEventThrottle={16}
          style={{ width: slideWidth }}
          contentContainerStyle={{ width: slideWidth * slides.length }}
        >
          {slides.map((slide) => (
            <View key={slide.id} style={{ width: slideWidth }}>
              <VHeroBanner
                tag={slide.tag}
                title1={slide.title1}
                title2={slide.title2}
                meta={slide.meta}
                gradient={slide.gradient}
                thumbnail={slide.thumbnail}
                onPlay={() => onPlay(slide.id)}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* Dot indicators — only render once the carousel has measured. */}
      {slideWidth > 0 && slides.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            marginTop: 8,
          }}
        >
          {slides.map((s, idx) => {
            const active = idx === activeIndex;
            return (
              <Pressable
                key={s.id}
                onPress={() => handleDotPress(idx)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${idx + 1}`}
                style={{
                  width: active ? 14 : 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: active
                    ? tokens["--vida-accent"]
                    : tokens["--vida-text-dim"],
                }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
