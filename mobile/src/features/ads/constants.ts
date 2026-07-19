import { TestIds } from "react-native-google-mobile-ads";

/**
 * AdMob unit IDs + native-ad placement rules.
 *
 * Unit IDs come from `admob.md`. The Android App ID is configured in
 * `app.json` under the `react-native-google-mobile-ads` plugin. iOS App ID
 * is still pending (see admob.md) and falls back to the test ID in dev.
 */
const PRODUCTION_REWARDED_AD_UNIT = "ca-app-pub-3898064484524772/9448775876";
const PRODUCTION_NATIVE_AD_UNIT = "ca-app-pub-3898064484524772/6271948196";

export function rewardedAdUnitId(): string {
  return __DEV__ ? TestIds.REWARDED : PRODUCTION_REWARDED_AD_UNIT;
}

export function nativeAdUnitId(): string {
  return __DEV__ ? TestIds.NATIVE : PRODUCTION_NATIVE_AD_UNIT;
}

/**
 * Native ad cadence (tunable, not hardcoded per spec rule on no magic values).
 * - FEED_INTERVAL: inject one native ad after every N series cards.
 * - PLAYER_INTERVAL: inject one native ad after every N episodes landed on.
 * - PLAYER_SESSION_CAP: max native ads shown per player session (AdMob
 *   frequency / retention guard; mirrors the rewarded AD_DAILY_CAP concept).
 */
export const NATIVE_AD_FEED_INTERVAL = 4;
export const NATIVE_AD_PLAYER_INTERVAL = 3;
export const NATIVE_AD_PLAYER_SESSION_CAP = 10;
/** Background prefetch depth for the native-ad pool (ads kept warm). */
export const NATIVE_AD_POOL_SIZE = 3;
