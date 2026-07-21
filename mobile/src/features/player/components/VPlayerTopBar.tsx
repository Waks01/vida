import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";

/**
 * Floating top bar of the swipe player: back, "Ep X of N" pill, more.
 * Sits absolutely positioned at the top of the video surface, padded
 * for the status bar. Each Pressable is a real button (no full-screen
 * intercepting — the play/pause hit area is scoped to the center of
 * the video, see `VSwipePlayer`).
 */
export function VPlayerTopBar({
  episodeNumber,
  totalEpisodes,
  onBack,
  onReport,
}: {
  episodeNumber: number;
  totalEpisodes: number;
  onBack: () => void;
  onReport?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon name="arrow-back" size={18} color="#fff" />
      </Pressable>
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
          Ep {episodeNumber} of {totalEpisodes}
        </Text>
      </View>
      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon name="ellipsis-vertical" size={18} color="#fff" />
      </Pressable>

      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            paddingTop: insets.top + 56,
            paddingRight: 16,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: tokens["--vida-surface"],
              borderRadius: 12,
              borderWidth: 1,
              borderColor: tokens["--vida-border"],
              paddingVertical: 6,
              minWidth: 180,
            }}
          >
            <Pressable
              onPress={() => { setMenuOpen(false); onReport?.(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <VIcon name="flag-outline" size={16} color={tokens["--vida-text-primary"]} />
              <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>
                Report
              </Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: tokens["--vida-border"] }} />
            <Pressable
              onPress={() => { setMenuOpen(false); onBack(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <VIcon name="close" size={16} color={tokens["--vida-text-primary"]} />
              <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>
                Close player
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
