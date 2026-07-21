import { useCallback, useEffect, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

/**
 * Auto-advance a horizontal ScrollView by one card width every `intervalMs`.
 * Pauses while the user is touching the rail and resumes 1.5× the interval
 * after they let go. Used by the Continue Watching rail so return users
 * see motion in the first frame after loading.
 *
 * The CW cards are 130px wide and live in a non-paged scroller, so this
 * advances by delta (one card), not by full screen width.
 *
 * Important: `offsetX` is held in a ref (not state) because the autoplay
 * timer captures the `advance` function once and re-uses that closure for
 * every tick. If we used state, the closure would freeze the first
 * `offsetX` it saw and the rail would scroll to the same spot forever.
 */
export function useSmoothCarousel({
  scrollRef,
  itemCount,
  cardWidth,
  intervalMs = 3500,
  resumeDelayMs,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
  itemCount: number;
  cardWidth: number;
  intervalMs?: number;
  resumeDelayMs?: number;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserInteracting = useRef(false);
  const offsetX = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Defined as a ref so the timer can call the latest version on each tick.
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    const sv = scrollRef.current;
    if (!sv || itemCount <= 1) return;
    const maxX = Math.max(0, (itemCount * cardWidth) - cardWidth);
    const next = offsetX.current + cardWidth > maxX ? 0 : offsetX.current + cardWidth;
    sv.scrollTo({ x: next, animated: true });
    // Re-arm for the next advance so the rail keeps moving on its own.
    timer.current = setTimeout(() => advanceRef.current(), intervalMs);
  };

  const schedule = useCallback(
    (delay = intervalMs) => {
      clear();
      if (isUserInteracting.current || itemCount <= 1) return;
      timer.current = setTimeout(() => advanceRef.current(), delay);
    },
    [clear, intervalMs, itemCount],
  );

  const handleTouchStart = useCallback(() => {
    isUserInteracting.current = true;
    clear();
  }, [clear]);

  const handleTouchEnd = useCallback(() => {
    isUserInteracting.current = false;
    schedule(resumeDelayMs ?? intervalMs * 1.5);
  }, [intervalMs, resumeDelayMs, schedule]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetX.current = e.nativeEvent.contentOffset.x;
  }, []);

  useEffect(() => () => clear(), [clear]);

  // Kick off the autoplay once on mount (and when the rail changes length).
  useEffect(() => {
    schedule();
    return clear;
  }, [schedule, clear, itemCount]);

  return { handleTouchStart, handleTouchEnd, onScroll, schedule, clear };
}
