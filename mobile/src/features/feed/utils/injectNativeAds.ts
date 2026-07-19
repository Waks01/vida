/** Discriminated union for feed/player decks that interleave native ads. */
export type FeedItem<T> =
  | { kind: "item"; id: string; value: T }
  | { kind: "ad"; id: string };

/**
 * Inject a native-ad slot after every `interval` real items.
 * e.g. interval=4 → [item,item,item,item,ad,item,...].
 * The ad `id` is stable per position so React keys don't churn on reload.
 */
export function injectNativeAds<T>(items: T[], interval: number, keyOf: (item: T) => string): FeedItem<T>[] {
  if (interval <= 0) return items.map((value) => ({ kind: "item", id: keyOf(value), value }));
  const out: FeedItem<T>[] = [];
  items.forEach((value, i) => {
    out.push({ kind: "item", id: keyOf(value), value });
    if ((i + 1) % interval === 0) {
      out.push({ kind: "ad", id: `native-ad-${Math.floor((i + 1) / interval)}` });
    }
  });
  return out;
}
