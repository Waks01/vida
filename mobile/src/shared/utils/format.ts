/** $4.99 → "US$4.99"; 0 → "Free". */
export function formatCurrency(amount: number, currency = "USD"): string {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** 1200 → "1,200"; coins get a ✦ glyph in UI via VBadge, not here. */
export function formatCoins(coins: number): string {
  return new Intl.NumberFormat("en-US").format(coins);
}

/** Seconds → "1:00" / "0:45". */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
