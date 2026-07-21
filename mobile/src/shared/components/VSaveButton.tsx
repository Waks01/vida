import { Pressable } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";
import { useWatchlist, useWatchlistMutations } from "../../features/watchlist/hooks/useWatchlist";
import { VIcon } from "./VIcon";

/**
 * Bookmark button for the series detail page. Reflects the current
 * saved-state from the watchlist query and toggles between
 * `bookmark` (filled) and `bookmark-outline` (empty) on press. The
 * button is disabled while a mutation is in flight so a fast double
 * tap doesn't fire two requests.
 */
export function VSaveButton({ seriesId }: { seriesId: string }) {
  const { tokens } = useTheme();
  const { data: items = [] } = useWatchlist();
  const { add, remove, isAdding, isRemoving } = useWatchlistMutations();

  const saved = items.some((entry) => entry.series_id === seriesId);
  const busy = isAdding || isRemoving;

  const handlePress = () => {
    if (busy) return;
    if (saved) {
      remove.mutate(seriesId);
    } else {
      add.mutate(seriesId);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from watchlist" : "Save to watchlist"}
      accessibilityState={{ busy, selected: saved }}
      hitSlop={8}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: saved ? tokens["--vida-primary"] : tokens["--vida-surface-2"],
        borderWidth: 1,
        borderColor: saved ? tokens["--vida-primary"] : tokens["--vida-border"],
        alignItems: "center",
        justifyContent: "center",
        opacity: busy ? 0.6 : 1,
      }}
    >
      <VIcon
        name={saved ? "bookmark" : "bookmark-outline"}
        size={20}
        color={saved ? "#fff" : tokens["--vida-text-primary"]}
      />
    </Pressable>
  );
}
