import { useEffect, useRef } from "react";
import { useRewardedAd } from "react-native-google-mobile-ads";

import { rewardedAdUnitId } from "../constants";

/**
 * Mounted once at app launch (see Providers). Keeps a Rewarded Ad warming in
 * the background so that when the user taps "Watch Ad" it shows instantly
 * instead of spinning on "Loading ad…". The SDK hook auto-reloads the next
 * ad the moment this one closes, so the pool is continuous.
 */
export function RewardedAdPreloader() {
  const loadingRef = useRef(false);
  const rewarded = useRewardedAd(rewardedAdUnitId(), {
    requestNonPersonalizedAdsOnly: false,
  });

  useEffect(() => {
    if (rewarded.error) {
      // AdMob will retry on next load; surface nothing, keep trying.
    }
  }, [rewarded.error]);

  useEffect(() => {
    if (!rewarded.isLoaded && !loadingRef.current) {
      loadingRef.current = true;
      rewarded.load();
    }
    if (rewarded.isLoaded) loadingRef.current = false;
  }, [rewarded.isLoaded, rewarded.load]);

  useEffect(() => {
    // As soon as an ad closes (watched or dismissed), preload the next one.
    if (rewarded.isClosed && !loadingRef.current) {
      loadingRef.current = true;
      rewarded.load();
    }
  }, [rewarded.isClosed, rewarded.load]);

  return null;
}
