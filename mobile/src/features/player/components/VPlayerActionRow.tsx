import { Pressable, Text, View } from "react-native";
import { Share } from "react-native";

import { VIcon } from "../../../shared/components/VIcon";

/**
 * Three-up action row in the player bottom overlay.
 *
 * - Like: optimistic local toggle (no backend yet — wire to a `/like`
 *   endpoint in a follow-up).
 * - Comment: opens a stub modal sheet owned by the parent.
 * - Share: native share via `react-native`'s `Share.share()`.
 *
 * All three are real Pressables with real onPress handlers.
 */
export function VPlayerActionRow({
  seriesTitle,
  seriesId,
  episodeNumber,
  episodeId,
  liked,
  onLikeToggle,
  onCommentPress,
}: {
  seriesTitle: string;
  seriesId: string;
  episodeNumber: number;
  episodeId: string;
  liked: boolean;
  onLikeToggle: () => void;
  onCommentPress: () => void;
}) {
  const handleShare = async () => {
    const deepLink = `https://vida.app/s/${seriesId}/e/${episodeId}`;
    try {
      await Share.share({
        message: `Watch "${seriesTitle}" — Ep ${episodeNumber} on Vida\n${deepLink}`,
        title: seriesTitle,
      });
    } catch {
      // User dismissed the share sheet — no error needed.
    }
  };

  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      <Pressable
        onPress={onLikeToggle}
        accessibilityRole="button"
        accessibilityLabel={liked ? "Unlike" : "Like"}
        style={{ alignItems: "center", gap: 4 }}
      >
        <VIcon name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#f43f5e" : "#fff"} />
        <Text style={{ color: "#fff", fontSize: 10 }}>Like</Text>
      </Pressable>
      <Pressable
        onPress={onCommentPress}
        accessibilityRole="button"
        accessibilityLabel="Comments"
        style={{ alignItems: "center", gap: 4 }}
      >
        <VIcon name="chatbubble-outline" size={22} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 10 }}>Comment</Text>
      </Pressable>
      <Pressable
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share"
        style={{ alignItems: "center", gap: 4 }}
      >
        <VIcon name="share-social-outline" size={22} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 10 }}>Share</Text>
      </Pressable>
    </View>
  );
}
