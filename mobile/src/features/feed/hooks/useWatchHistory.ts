import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../core/api/queryClient";

import { feedApi } from "../api/feedApi";
import type { WatchHistoryEntry } from "../types";

/**
 * Continue-Watching rail. Returns the user's most-recently-watched
 * series, in last-watched order. Empty array when the user hasn't
 * watched anything yet — the home hides the Resume shelf in that
 * case (per product decision).
 *
 * Cached for 30s — the player posts a watch heartbeat that should
 * show up on the next visit, but a sub-second re-fetch isn't needed.
 */
export function useWatchHistory(limit = 4) {
  return useQuery<WatchHistoryEntry[]>({
    queryKey: queryKeys.watchHistory(limit),
    queryFn: () => feedApi.getWatchHistory(limit),
    staleTime: 30_000,
  });
}
