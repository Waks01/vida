import { Image, Pressable, Text, View } from "react-native";

import { LinearGradient } from "./VLinearGradient";
import { VIcon } from "./VIcon";
import { useTheme } from "../../providers/ThemeProvider";

/**
 * Featured-drama hero banner. Used both as a single banner and as one
 * slide inside `VHeroCarousel`.
 *
 * Visual order (bottom → top):
 *   1. Thumbnail (full opacity, cover crop) — the real series poster is
 *      the dominant visual when available.
 *   2. Per-slide gradient — only used as a legibility mask at the
 *      bottom, not a full overlay. Sits behind the title and play
 *      button so the poster stays visible.
 *
 * `title1` + `title2` are intentionally separate so the design's deliberate
 * line break ("The Heir's / Secret Bride") survives.
 */
export function VHeroBanner({
  tag,
  title1,
  title2,
  meta,
  onPlay,
  gradient = ["rgba(11, 7, 18, 0)", "rgba(11, 7, 18, 0.6)", "rgba(11, 7, 18, 0.95)"],
  thumbnail,
}: {
  tag: string;
  title1: string;
  title2: string;
  meta: string;
  onPlay: () => void;
  /**
   * 3-stop gradient used as a bottom legibility mask (not a full-cover
   * fill). Default is transparent at top → ink at bottom so the
   * thumbnail shows through and the text remains readable.
   */
  gradient?: string[];
  /** Optional thumbnail URL — rendered at full opacity as the background. */
  thumbnail?: string;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`Play ${title1} ${title2}`}
      style={{
        marginHorizontal: 14,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: tokens["--vida-border"],
      }}
    >
      <View style={{ aspectRatio: 16 / 11, position: "relative", backgroundColor: tokens["--vida-surface-2"] }}>
        {/* Thumbnail — full opacity, the dominant visual when present. */}
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : null}
        {/* Bottom legibility mask — transparent at top, ink at bottom.
            Sits above the thumbnail so the title is readable without
            hiding the poster. */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", inset: 0 }}
        />
        {/* Bottom info row */}
        <View
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 14,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: tokens["--vida-accent"],
                letterSpacing: 1,
                fontWeight: "700",
              }}
            >
              {tag}
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: "#fff",
                marginTop: 4,
                lineHeight: 1.15,
                letterSpacing: -0.3,
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {title1}
              {"\n"}
              {title2}
            </Text>
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "rgba(255,255,255,0.85)",
                marginTop: 4,
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {meta}
            </Text>
          </View>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <VIcon name="play" size={14} color="#1a1426" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
