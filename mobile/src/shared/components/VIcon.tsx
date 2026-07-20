import { Ionicons } from "@expo/vector-icons";
import { type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";

export type VIconName = keyof typeof Ionicons.glyphMap;

/** Themed icon wrapper. Replaces emoji glyphs in favor of vector icons. */
export function VIcon({
  name,
  size = 20,
  color,
  style,
}: {
  name: VIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { tokens } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? tokens["--vida-text-primary"]} style={style} />;
}
