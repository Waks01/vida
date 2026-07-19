import { type ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { MobileAds } from "react-native-google-mobile-ads";

import { queryClient } from "../core/api/queryClient";
import { ThemeProvider } from "./ThemeProvider";
import { RewardedAdPreloader } from "../features/ads/components/RewardedAdPreloader";
import { nativeAdPool } from "../features/ads/pool";

/** Composes all app-wide providers. Mounted once in app/_layout.tsx. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void MobileAds().initialize();
    // Start background native-ad prefetch (keeps NATIVE_AD_POOL_SIZE warm).
    nativeAdPool.start();
    return () => nativeAdPool.stop();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        {/* Background ad warming: rewarded + native pools, from app launch. */}
        <RewardedAdPreloader />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
