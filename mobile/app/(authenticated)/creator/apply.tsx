import { useState } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../../src/shared/components/VButton";
import { VInput } from "../../../src/shared/components/VInput";
import { VIcon } from "../../../src/shared/components/VIcon";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { creatorsApi } from "../../../src/features/feed/api/creatorsApi";

export default function CreatorApply() {
  const { tokens } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!displayName.trim() || !portfolio.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      await creatorsApi.apply({
        display_name: displayName.trim(),
        payout_method: genre,
        payout_details: portfolio.trim(),
      });
      Alert.alert("Success", "Your creator application has been submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ padding: 16, alignItems: "center" }}>
        <VIcon name="videocam" size={28} color={tokens["--vida-primary"]} />
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 18, fontWeight: "800", marginTop: 8 }}>
          Share your dramas
        </Text>
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4, textAlign: "center" }}>
          Earn 65% of ad revenue + coin unlocks from your series.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <VInput label="Creator / stage name" value={displayName} onChangeText={setDisplayName} placeholder="Your creator name" />
        <VInput label="Portfolio link (YouTube, etc.)" value={portfolio} onChangeText={setPortfolio} placeholder="https://youtube.com/@you" autoCapitalize="none" />
        <View>
          <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 6, fontSize: 13 }}>Primary genre</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {["Romance", "Thriller", "Werewolf"].map((g) => (
              <PressableRow key={g} active={g === genre} label={g} onPress={() => setGenre(g)} tokens={tokens} />
            ))}
          </View>
        </View>
        <VButton
          title={submitting ? "Submitting…" : "Submit Application"}
          fullWidth
          onPress={submit}
          style={{ marginTop: 4 }}
          disabled={submitting}
        />
        <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, textAlign: "center" }}>
          Reviewed within 48h · No upfront cost
        </Text>
      </View>
    </ScrollView>
  );
}

function PressableRow({ active, label, onPress, tokens }: { active: boolean; label: string; onPress: () => void; tokens: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? tokens["--vida-primary"] : tokens["--vida-border"],
        backgroundColor: active ? tokens["--vida-primary"] : tokens["--vida-surface"],
      }}
    >
      <Text style={{ color: active ? "#fff" : tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
