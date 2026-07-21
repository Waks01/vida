import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import type { VideoPlayer } from "expo-video";

import { formatDuration } from "../../../shared/utils/format";
import { useTheme } from "../../../providers/ThemeProvider";

/**
 * Seek bar + current / total time labels.
 *
 * The fill width and current-time label are driven by the player's
 * `timeUpdate` event. Total time falls back to the episode's known
 * `duration_seconds` until the player has loaded enough to know the
 * real duration (HLS streams report 0 until ready).
 */
export function VPlayerProgress({
  player,
  fallbackDurationSeconds,
}: {
  player: VideoPlayer;
  fallbackDurationSeconds: number;
}) {
  const { tokens } = useTheme();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSeconds);

  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime: t }) => {
      setCurrentTime(t);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      // Once the stream is ready, prefer the real player duration
      // over the schema's nominal value. The `status` type union is
      // stricter than the runtime values emitted by expo-video, so
      // we widen with `as string` to compare both readyToPlay and
      // playing without TS narrowing us out.
      const s = status as string;
      if (s === "readyToPlay" || s === "playing") {
        const d = player.duration;
        if (d > 0) setDuration(d);
      }
    });
    return () => sub.remove();
  }, [player]);

  const pct = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const totalLabel = duration > 0 ? formatDuration(duration) : formatDuration(fallbackDurationSeconds);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <Text style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>
        {formatDuration(currentTime)}
      </Text>
      <View
        style={{
          flex: 1,
          height: 3,
          backgroundColor: tokens["--vida-surface-3"],
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            backgroundColor: tokens["--vida-primary"],
            borderRadius: 2,
          }}
        />
      </View>
      <Text style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>{totalLabel}</Text>
    </View>
  );
}
