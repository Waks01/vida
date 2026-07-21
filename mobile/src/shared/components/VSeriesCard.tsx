import { Image, Pressable, Text, View } from "react-native";

import { LinearGradient } from "./VLinearGradient";
import { formatCoins } from "../utils/format";
import { useTheme } from "../../providers/ThemeProvider";

export type MarketingBadgeTone = "new" | "vip" | "excl" | "hot";

export interface SeriesCardData {
  id: string;
  title: string;
  thumbnail_url: string;
  episodes: number;
  coinsPerEpisode: number;
  /** Optional marketing badge (top-left of poster). */
  marketingBadge?: MarketingBadgeTone;
  /** Optional total views to render in the meta line (mono). */
  views?: number;
  /** Optional watch progress 0..1 — renders a bar overlay (wide variant only). */
  progress?: number;
  /** Optional time remaining in seconds (wide variant only). */
  remainingSeconds?: number;
  /** Episode number the user is on — used in the CW meta line ("EP 12"). */
  currentEpisode?: number;
  /** 2-stop gradient rendered behind the thumbnail — gives the card its
   *  visual identity when no thumbnail is available. */
  gradient?: [string, string];
}

/**
 * The eight poster-gradient pairs the design rotates through. These match
 * the gradients used on the cards in `docs/vida-redesign.html` §1 home band
 * (`.sh-card .poster` inline styles). Keep this list small and curated —
 * the visual identity comes from the small palette, not a per-card random.
 */
export const POSTER_GRADIENTS: [string, string][] = [
  ["#3a0e1f", "#1a0e2a"], // crimson → ink
  ["#1a0e2a", "#3a0e1f"], // ink → crimson
  ["#0e1a2a", "#1a0e2a"], // midnight → ink
  ["#1a1f3a", "#0e1a2a"], // iris-deep → midnight
  ["#3a0e1f", "#2a0e3a"], // crimson → iris-deep
  ["#2a0e3a", "#1a0e2a"], // iris-deep → ink
  ["#1a0e2a", "#1a1f3a"], // ink → iris-deep
  ["#3a0e1f", "#0e1a2a"], // crimson → midnight
];

/** Deterministic gradient from a series id — same input → same card. */
export function posterGradientFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % POSTER_GRADIENTS.length;
  // idx is always in range (modulo of a positive number); the
  // non-null assertion keeps TypeScript from widening the tuple
  // return to `[string, string] | undefined` when the array is
  // accessed through a computed index.
  return POSTER_GRADIENTS[idx]!;
}

const FALLBACK_THUMB =
  "https://peach.blender.org/wp-content/uploads/poster_bunny_big.jpg";

const BADGE_TONE: Record<MarketingBadgeTone, { bg: (t: ReturnType<typeof useTheme>["tokens"]) => string; fg: (t: ReturnType<typeof useTheme>["tokens"]) => string; label: string }> = {
  new:  { bg: (t) => t["--vida-success"], fg: () => "#ffffff", label: "NEW" },
  vip:  { bg: (t) => t["--vida-primary"], fg: () => "#ffffff", label: "VIP" },
  excl: { bg: (t) => t["--vida-danger"],  fg: () => "#ffffff", label: "EXCL" },
  hot:  { bg: (t) => t["--vida-accent"],  fg: () => "#1a1a1a", label: "HOT" },
};

function MarketingBadge({ tone }: { tone: MarketingBadgeTone }) {
  const { tokens } = useTheme();
  const t = BADGE_TONE[tone];
  return (
    <View
      style={{
        position: "absolute",
        top: 5,
        left: 5,
        zIndex: 2,
        backgroundColor: t.bg(tokens),
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: t.fg(tokens), fontSize: 9, fontWeight: "700", letterSpacing: 0.4 }}>
        {t.label}
      </Text>
    </View>
  );
}

function CoinChip({ amount }: { amount: number }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: "#f59e0b", fontSize: 9, fontWeight: "700", fontFamily: "monospace" }}>
        ✦ {formatCoins(amount)}
      </Text>
    </View>
  );
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return String(views);
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Poster block — a per-card gradient sits behind the optional thumbnail.
 * When the thumbnail is missing or still loading the gradient is the
 * visible identity. Mirrors `.sh-card .poster` from the redesign (minus
 * the emoji overlay, which the user asked to drop).
 */
function Poster({
  width,
  aspectRatio,
  thumbnailUrl,
  gradient,
  children,
}: {
  width: number | undefined;
  aspectRatio: number;
  thumbnailUrl: string;
  gradient: [string, string];
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        width,
        aspectRatio,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.4)",
      }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: "100%", height: "100%", opacity: 0.85 }}
          resizeMode="cover"
        />
      ) : null}
      {/* Bottom legibility mask — matches .sh-card .poster::after */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" }}
      />
      {children}
    </View>
  );
}

export function VSeriesCard({
  series,
  onPress,
  compact = false,
  wide = false,
}: {
  series: SeriesCardData;
  onPress: (id: string) => void;
  compact?: boolean;
  /** Wider card for Continue Watching — 16:10 aspect with progress bar overlay. */
  wide?: boolean;
}) {
  const { tokens } = useTheme();
  const thumbnailUrl = series.thumbnail_url || FALLBACK_THUMB;
  const gradient = series.gradient ?? posterGradientFor(series.id);

  // Wide (Continue Watching) variant ----------------------------------
  if (wide) {
    const pct = Math.max(0, Math.min(1, series.progress ?? 0));
    return (
      <Pressable onPress={() => onPress(series.id)} style={{ width: 135, marginRight: 8 }}>
        <Poster
          width={135}
          aspectRatio={16 / 10}
          thumbnailUrl={thumbnailUrl}
          gradient={gradient}
        >
          {series.marketingBadge ? <MarketingBadge tone={series.marketingBadge} /> : null}
          <View style={{ position: "absolute", bottom: 4, right: 4, zIndex: 2 }}>
            <CoinChip amount={series.coinsPerEpisode} />
          </View>
          {/* Progress bar — bottom edge, 3px tall. Z-above the gradient. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              backgroundColor: tokens["--vida-border"],
              zIndex: 3,
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                backgroundColor: tokens["--vida-accent"],
                borderTopRightRadius: pct >= 1 ? 1.5 : 0,
                borderBottomRightRadius: pct >= 1 ? 1.5 : 0,
              }}
            />
          </View>
        </Poster>
        <Text
          numberOfLines={1}
          style={{ color: tokens["--vida-text-primary"], marginTop: 6, fontSize: 11, fontWeight: "600" }}
        >
          {series.title}
        </Text>
        <Text
          style={{
            color: tokens["--vida-text-dim"],
            fontSize: 9,
            marginTop: 2,
            fontFamily: "monospace",
          }}
        >
          {typeof series.remainingSeconds === "number"
            ? `EP ${series.currentEpisode ?? 1} · ${formatRemaining(series.remainingSeconds)} LEFT`
            : `${series.episodes} eps`}
        </Text>
      </Pressable>
    );
  }

  // Compact variant (Trending / Top 10 shelves) -----------------------
  if (compact) {
    return (
      <Pressable onPress={() => onPress(series.id)} style={{ width: 91, marginRight: 8 }}>
        <Poster
          width={91}
          aspectRatio={2 / 3}
          thumbnailUrl={thumbnailUrl}
          gradient={gradient}
        >
          {series.marketingBadge ? <MarketingBadge tone={series.marketingBadge} /> : null}
          <View style={{ position: "absolute", bottom: 4, right: 4, zIndex: 2 }}>
            <CoinChip amount={series.coinsPerEpisode} />
          </View>
        </Poster>
        <Text
          numberOfLines={2}
          style={{
            color: tokens["--vida-text-primary"],
            marginTop: 5,
            fontSize: 10,
            fontWeight: "600",
            lineHeight: 1.2,
          }}
        >
          {series.title}
        </Text>
        <Text
          style={{
            color: tokens["--vida-text-dim"],
            fontSize: 9,
            marginTop: 2,
            fontFamily: "monospace",
          }}
        >
          {typeof series.views === "number"
            ? `${series.episodes} EPS · ${formatViews(series.views)}`
            : `${series.episodes} eps`}
        </Text>
      </Pressable>
    );
  }

  // Full variant (search results, series grid) ------------------------
  return (
    <Pressable onPress={() => onPress(series.id)} style={{ width: "48%", marginBottom: 14 }}>
      <Poster
        width={"100%" as any}
        aspectRatio={9 / 16}
        thumbnailUrl={thumbnailUrl}
        gradient={gradient}
      >
        {series.marketingBadge ? <MarketingBadge tone={series.marketingBadge} /> : null}
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            zIndex: 2,
          }}
        >
          <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700", fontFamily: "monospace" }}>
            ✦ {formatCoins(series.coinsPerEpisode)}
          </Text>
        </View>
      </Poster>
      <Text
        numberOfLines={1}
        style={{ color: tokens["--vida-text-primary"], marginTop: 6, fontSize: 13, fontWeight: "600" }}
      >
        {series.title}
      </Text>
      <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11 }}>
        {series.episodes} eps
      </Text>
    </Pressable>
  );
}
