import { useQuery, useQueryClient } from "@tanstack/react-query";

import { feedApi } from "../api/feedApi";
import { queryKeys } from "../../../core/api/queryClient";

export function useSeries(id: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.series(id),
    queryFn: () => feedApi.getSeries(id),
    enabled: !!id,
  });

  async function refetch() {
    await qc.invalidateQueries({ queryKey: queryKeys.series(id) });
  }

  return {
    series: query.data ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch,
  };
}
