import { useQuery, useQueryClient } from "@tanstack/react-query";

import { feedApi } from "../api/feedApi";
import { queryKeys } from "../../../core/api/queryClient";
import type { SeriesSummary } from "../types";

/**
 * Fetch a single category's feed (e.g. all `werewolf` series).
 *
 * Query keys are namespaced by category, so the home can mount N rails
 * (one per visible chip) without cross-invalidating each other. Pass
 * `undefined` to get the unfiltered top-views feed (used by the hero
 * and Resume rail, which don't belong to any single category).
 */
export function useFeed({ category }: { category?: string } = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: category
      ? queryKeys.categoryFeed(category)
      : queryKeys.seriesList(),
    queryFn: () => feedApi.listSeries(category),
    staleTime: 60_000,
  });

  async function refetch() {
    if (category) {
      await qc.invalidateQueries({ queryKey: queryKeys.categoryFeed(category) });
    } else {
      await qc.invalidateQueries({ queryKey: queryKeys.seriesList() });
    }
  }

  return {
    series: (query.data ?? []) as SeriesSummary[],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch,
  };
}
