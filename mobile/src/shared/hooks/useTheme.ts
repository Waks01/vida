import { useColorScheme } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

/** Re-export theme hook for feature/shared consumers. */
export { useTheme } from "../../providers/ThemeProvider";

/** Tracks light/dark system scheme (used to pick default theme on first launch). */
export function useSystemColorScheme(): "light" | "dark" {
  return useColorScheme() === "light" ? "light" : "dark";
}
