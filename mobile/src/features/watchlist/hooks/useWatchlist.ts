import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../core/api/queryClient";

import { watchlistApi, type WatchlistEntry } from "../api/watchlistApi";

/**
 * List hook — the user's saved series, most-recently-added first.
 * Returns an empty array when the user hasn't saved anything.
 */
export function useWatchlist() {
  return useQuery<WatchlistEntry[]>({
    queryKey: queryKeys.watchList,
    queryFn: () => watchlistApi.list(50, 0),
    staleTime: 30_000,
  });
}

/**
 * Mutations hook — exposes `add` and `remove` callbacks. Both
 * invalidate the watchlist query so the list refetches. The hook
 * returns the current mutation state (`isAdding`, `isRemoving`) so
 * the caller can disable the button while a request is in flight.
 */
export function useWatchlistMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.watchList });

  const add = useMutation({
    mutationFn: (seriesId: string) => watchlistApi.add(seriesId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (seriesId: string) => watchlistApi.remove(seriesId),
    onSuccess: invalidate,
  });

  return {
    add,
    remove,
    isAdding: add.isPending,
    isRemoving: remove.isPending,
  };
}
