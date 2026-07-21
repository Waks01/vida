import { QueryClient } from "@tanstack/react-query";

import { storage } from "../storage/mmkv";

/**
 * TanStack Query client + MMKV persistence.
 * Feed/series queries are cached offline (swipe player needs instant playback).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24, // 24h — matches MMKV persistence window
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  feed: ["feed"] as const,
  series: (id: string) => ["series", id] as const,
  seriesList: (cursor?: string) => ["series", "list", cursor ?? "first"] as const,
  /**
   * Per-category feed list — invalidating this key re-fetches just the
   * chip row the user clicked, not the entire home. Used by `useFeed`
   * and by the home's chip onPress handler.
   */
  categoryFeed: (category: string) => ["series", "category", category] as const,
  /**
   * Continue-Watching rail. Invalidation re-fetches the most-recent
   * watch history so a heartbeat posted from the player shows up on
   * the next mount of the home tab.
   */
  watchHistory: (limit: number) => ["users", "me", "watch-history", limit] as const,
  /**
   * Saved-series list. Invalidation re-fetches the entire list (the
   * list is small — capped at ~200 entries) so an add or remove is
   * reflected on the next mount of the My List screen.
   */
  watchList: ["users", "me", "watchlist"] as const,
  wallet: ["wallet"] as const,
  coinHistory: (page: number) => ["coins", "history", page] as const,
  profile: ["profile"] as const,
};

// Lightweight MMKV persister (no extra dep required for Phase 0).
export const mmkvPersister = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.remove(key);
  },
};
