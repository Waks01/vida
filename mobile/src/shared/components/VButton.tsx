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

  const borderColor =
    variant === "ghost" ? tokens["--vida-primary"] : "transparent";

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
      android_ripple={{
        color: variant === "primary" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)",
        borderless: false,
      }}
      style={({ pressed }) => [
        {
          height: s.h,
          paddingHorizontal: s.px,
          borderRadius: 12,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor,
          transform: [{ scale: pressed && !disabled && !loading ? 0.97 : 1 }],
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
