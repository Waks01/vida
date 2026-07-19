import { NativeAd } from "react-native-google-mobile-ads";

import { nativeAdUnitId, NATIVE_AD_POOL_SIZE } from "./constants";

/**
 * Background native-ad prefetch pool (TikTok/Reels-style).
 *
 * Keeps `NATIVE_AD_POOL_SIZE` NativeAds warm in the background from app
 * launch. `consume()` returns the next ready ad and immediately triggers a
 * replacement fetch so the pool never empties while the user swipes. Slots
 * in the feed/player pull from here instead of loading on mount, so an ad is
 * already fetched before its card scrolls into view.
 *
 * Module-level singleton: survives re-renders and is shared app-wide.
 */
class NativeAdPool {
  private queue: NativeAd[] = [];
  private inflight = 0;
  private mounted = false;

  /** Begin background prefetch. Safe to call multiple times. */
  start() {
    this.mounted = true;
    this.fill();
  }

  stop() {
    this.mounted = false;
    this.drain();
  }

  private drain() {
    this.queue.forEach((ad) => ad.destroy());
    this.queue = [];
  }

  private fill() {
    while (
      this.mounted &&
      this.queue.length + this.inflight < NATIVE_AD_POOL_SIZE
    ) {
      this.inflight += 1;
      NativeAd.createForAdRequest(nativeAdUnitId())
        .then((ad) => {
          this.inflight -= 1;
          if (!this.mounted) {
            ad.destroy();
            return;
          }
          this.queue.push(ad);
          this.fill();
        })
        .catch(() => {
          this.inflight -= 1;
        });
    }
  }

  /** Pull the next ready ad (or null if none loaded yet) and replenish. */
  consume(): NativeAd | null {
    const ad = this.queue.shift() ?? null;
    if (ad) this.fill();
    return ad;
  }

  get readyCount(): number {
    return this.queue.length;
  }
}

export const nativeAdPool = new NativeAdPool();
