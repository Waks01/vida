import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { VButton } from "../../../shared/components/VButton";
import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";

/**
 * Stub comments sheet — full-screen modal with a text input and a
 * "Send" button. Does NOT post to the backend yet; that's a
 * follow-up. The sheet exists so the player's Comment action is
 * tappable and shows real feedback.
 */
export function VCommentSheet({
  visible,
  onClose,
  episodeNumber,
  seriesTitle,
}: {
  visible: boolean;
  onClose: () => void;
  episodeNumber: number;
  seriesTitle: string;
}) {
  const { tokens } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: tokens["--vida-surface"],
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 28,
            borderTopWidth: 2,
            borderTopColor: tokens["--vida-primary"],
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens["--vida-border"],
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <VIcon name="chatbubble" size={20} color={tokens["--vida-text-primary"]} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: tokens["--vida-text-primary"] }}>
              Comments
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: tokens["--vida-text-muted"], marginBottom: 16 }}>
            Ep {episodeNumber} · {seriesTitle}
          </Text>
          <TextInput
            editable={false}
            placeholder="Comments aren't live yet — coming soon."
            placeholderTextColor={tokens["--vida-text-dim"]}
            style={{
              backgroundColor: tokens["--vida-surface-2"],
              borderRadius: 12,
              padding: 12,
              color: tokens["--vida-text-primary"],
              minHeight: 60,
              textAlignVertical: "top",
            }}
            multiline
          />
          <VButton
            title="Close"
            variant="ghost"
            fullWidth
            onPress={onClose}
            style={{ marginTop: 12 }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
