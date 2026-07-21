import { Pressable, ScrollView, Text } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";
import type { SeriesCategory } from "../../features/feed/types";

/**
 * Horizontal-scroll chip row used twice on the home — once for forms
 * (Hot, New, Trending, Movies, …) and once for tropes (Heartbreak,
 * Werewolf, …). One chip is the active selection; tapping another
 * calls `onChange` so the parent can `invalidateQueries` the matching
 * category.
 *
 * Visual matches the chip row under the search bar in the current
 * home (pill, 1px border, surface-2 fill, bone label). The active
 * chip fills with `--vida-primary` and the label flips white so it
 * reads as the user's current focus.
 */
export function CategoryChipRow({
  categories,
  activeKey,
  onChange,
}: {
  categories: { key: SeriesCategory; label: string }[];
  activeKey: SeriesCategory | null;
  onChange: (key: SeriesCategory) => void;
}) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 14,
        paddingBottom: 4,
        gap: 6,
      }}
    >
      {categories.map((c) => {
        const isActive = c.key === activeKey;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(c.key)}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${c.label}`}
            accessibilityState={{ selected: isActive }}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: isActive
                ? tokens["--vida-primary"]
                : tokens["--vida-surface-2"],
              borderWidth: 1,
              borderColor: isActive
                ? tokens["--vida-primary"]
                : tokens["--vida-border"],
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: isActive
                  ? "#fff"
                  : tokens["--vida-text-primary"],
              }}
            >
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
