import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

/**
 * Shelf header — small eyebrow label on the left, optional "See all" link on the right.
 * Matches docs/vida-redesign.html §4 ("Continue Watching", "Trending Tonight", etc.).
 */
export function VShelfHeader({
  eyebrow,
  title,
  seeAllHref,
  onSeeAllPress,
}: {
  eyebrow: string;
  title?: string;
  seeAllHref?: string;
  onSeeAllPress?: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 18,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: tokens["--vida-primary-light"],
          }}
        >
          {eyebrow}
        </Text>
        {title ? (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: tokens["--vida-text-primary"],
            }}
          >
            {title}
          </Text>
        ) : null}
      </View>
      {seeAllHref || onSeeAllPress ? (
        <Pressable
          onPress={onSeeAllPress}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={`See all ${eyebrow.toLowerCase()}`}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.4,
              color: tokens["--vida-primary-light"],
            }}
          >
            See all
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
