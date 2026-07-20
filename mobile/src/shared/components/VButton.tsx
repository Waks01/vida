import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "coin";
type Size = "sm" | "md" | "lg";

interface VButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const SIZES: Record<Size, { h: number; fs: number; px: number }> = {
  sm: { h: 36, fs: 13, px: 14 },
  md: { h: 44, fs: 15, px: 18 },
  lg: { h: 52, fs: 17, px: 22 },
};

/** Primary action button. Maps to vida-design.html §2 "Button". */
export function VButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  ...rest
}: VButtonProps) {
  const { tokens } = useTheme();
  const s = SIZES[size];

  const bg =
    variant === "primary"
      ? tokens["--vida-primary"]
      : variant === "danger"
        ? tokens["--vida-danger"]
        : variant === "coin"
          ? tokens["--vida-accent"]
          : variant === "secondary"
            ? tokens["--vida-surface-2"]
            : "transparent";

  const fg =
    variant === "coin"
      ? "#1a1a1a"
      : variant === "ghost"
        ? tokens["--vida-primary"]
        : tokens["--vida-text-primary"];

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={[
        {
          height: s.h,
          paddingHorizontal: s.px,
          borderRadius: 12,
          backgroundColor: bg,
          opacity: disabled ? 0.5 : 1,
          alignItems: "center",
          justifyContent: "center",
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[{ color: fg, fontSize: s.fs, fontWeight: "600" }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
