import { useQuery, useQueryClient } from "@tanstack/react-query";

import { feedApi } from "../api/feedApi";
import { queryKeys } from "../../../core/api/queryClient";
import type { SeriesSummary } from "../types";

export function useFeed() {
  const qc = useQueryClient();

  const seriesQuery = useQuery({
    queryKey: queryKeys.seriesList(),
    queryFn: feedApi.listSeries,
    staleTime: 60_000,
  });

  async function refetch() {
    await qc.invalidateQueries({ queryKey: queryKeys.seriesList() });
  }

  return {
    series: (seriesQuery.data ?? []) as SeriesSummary[],
    isLoading: seriesQuery.isLoading,
    isRefetching: seriesQuery.isRefetching,
    error: seriesQuery.error,
    refetch,
  };
}
