import { useState, useCallback, useEffect, useRef } from "react";
import { useRewardedAd, TestIds } from "react-native-google-mobile-ads";

import { walletApi } from "../../wallet/api/walletApi";
import { useWallet } from "../../wallet/hooks/useWallet";

const PRODUCTION_REWARDED_AD_UNIT = "ca-app-pub-3898064484524772/9448775876";

function adUnitId() {
  return __DEV__ ? TestIds.REWARDED : PRODUCTION_REWARDED_AD_UNIT;
}

export interface UseAdRewardResult {
  watchAd: () => Promise<{ awarded: number; balance: number; daily_remaining: number } | null>;
  isLoading: boolean;
  error: string | null;
  dailyRemaining: number;
  isAdReady: boolean;
}

export function useAdReward(): UseAdRewardResult {
  const { refetch } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyRemaining, setDailyRemaining] = useState(0);
  const loadingRef = useRef(false);

  const rewarded = useRewardedAd(adUnitId(), {
    requestNonPersonalizedAdsOnly: false,
  });

  useEffect(() => {
    if (rewarded.error) {
      setError(rewarded.error.message);
    }
  }, [rewarded.error]);

  useEffect(() => {
    if (!rewarded.isLoaded && !loadingRef.current) {
      loadingRef.current = true;
      rewarded.load();
    }
    if (rewarded.isLoaded) {
      loadingRef.current = false;
    }
  }, [rewarded.isLoaded, rewarded.load]);

  useEffect(() => {
    if (rewarded.isClosed && !loadingRef.current) {
      loadingRef.current = true;
      rewarded.load();
    }
  }, [rewarded.isClosed, rewarded.load]);

  const watchAd = useCallback(async () => {
    if (!rewarded.isLoaded) {
      setError("Ad not ready yet. Please try again.");
      return null;
    }

    setIsLoading(true);
    setError(null);
    setDailyRemaining(0);

    try {
      rewarded.show();

      await new Promise<void>((resolve, reject) => {
        const check = setInterval(() => {
          if (rewarded.isEarnedReward) {
            clearInterval(check);
            resolve();
          } else if (rewarded.isClosed) {
            clearInterval(check);
            reject(new Error("Ad closed before reward was earned"));
          }
        }, 250);
      });

      const unitId = adUnitId();
      const deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const callbackToken = crypto.randomUUID();
      const response = await walletApi.completeAd(unitId, deviceId, callbackToken);
      setDailyRemaining(response.daily_remaining);
      await refetch();
      return response;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to watch ad";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [rewarded, refetch]);

  return { watchAd, isLoading, error, dailyRemaining, isAdReady: rewarded.isLoaded };
}
