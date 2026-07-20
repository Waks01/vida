import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { router } from "expo-router";

import { VHeader } from "../../../src/shared/components/VHeader";
import { VButton } from "../../../src/shared/components/VButton";
import { VInput } from "../../../src/shared/components/VInput";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { creatorsApi } from "../../../src/features/feed/api/creatorsApi";

export default function CreatorUpload() {
  const { tokens } = useTheme();
  const [title, setTitle] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function upload() {
    if (!title.trim() || !seriesName.trim()) {
      Alert.alert("Missing fields", "Add an episode title and the series it belongs to.");
      return;
    }
    setSubmitting(true);
    try {
      const series = await creatorsApi.createSeries({ title: seriesName.trim() });
      await creatorsApi.getEpisodeUploadUrl(series.id, {
        filename: "episode.mp4",
        episode_title: title.trim(),
        episode_number: 1,
      });
      Alert.alert("Submitted", "Auto-encoded to HLS · thumbnail extracted · sent to admin for approval.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ paddingBottom: 24 }}>
      <VHeader title="Upload Episode" showBack />

      <View style={{ padding: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: tokens["--vida-surface"],
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: tokens["--vida-border"],
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
          }}
        >
          <VIcon name="videocam" size={32} color={tokens["--vida-text-primary"]} />
          <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600", marginTop: 6 }}>
            Tap to upload video
          </Text>
          <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11 }}>MP4 · vertical · up to 2 min</Text>
        </View>

        <VInput label="Episode title" value={title} onChangeText={setTitle} placeholder="Ep 1 — The Arrival" />
        <VInput label="Which series?" value={seriesName} onChangeText={setSeriesName} placeholder="Series name" />

        <View
          style={{
            backgroundColor: tokens["--vida-surface-2"],
            borderWidth: 1,
            borderColor: tokens["--vida-border"],
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12 }}>
            Auto-encoded to HLS · thumbnail extracted · sent to admin for approval.
          </Text>
        </View>

        <VButton title={submitting ? "Uploading…" : "Upload & Submit"} fullWidth onPress={upload} disabled={submitting} />
      </View>
    </ScrollView>
  );
}
