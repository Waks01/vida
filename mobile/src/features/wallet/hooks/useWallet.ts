import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { walletApi } from "../api/walletApi";
import { queryKeys } from "../../../core/api/queryClient";
import { hasCheckedInToday, setLastCheckInDate } from "../../../core/storage/mmkv";

export function useWallet() {
  const qc = useQueryClient();
  const balance = useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: walletApi.getBalance,
    staleTime: 30_000,
  });

  const packs = useQuery({
    queryKey: queryKeys.wallet,
    queryFn: walletApi.listPacks,
    staleTime: 60_000,
  });

  const transactions = useQuery({
    queryKey: queryKeys.coinHistory(1),
    queryFn: () => walletApi.getTransactions(),
    staleTime: 30_000,
  });

  const checkIn = useMutation({
    mutationFn: walletApi.dailyCheckIn,
    onSuccess: () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setLastCheckInDate(todayStr);
      qc.invalidateQueries({ queryKey: queryKeys.coinHistory(1) });
    },
  });

  return {
    balance: balance.data ?? 0,
    packs: packs.data ?? { coinRate: 10, minNgn: 100, stepNgn: 100 },
    transactions: transactions.data ?? [],
    isLoading: balance.isLoading || packs.isLoading,
    checkIn,
    hasCheckedInToday: hasCheckedInToday(),
    refetch: () => balance.refetch(),
  };
}
