import { View, type ViewProps } from "react-native";

let LinearGradientNative: any = null;
try {
  LinearGradientNative = require("expo-linear-gradient").LinearGradient;
} catch {
  LinearGradientNative = null;
}

/**
 * Safe LinearGradient wrapper.
 * Falls back to a plain View when the native module isn't available
 * (e.g. before a dev-client rebuild after adding expo-linear-gradient).
 */
export function LinearGradient({
  colors,
  start,
  end,
  style,
  children,
  ...rest
}: {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: any;
  children?: React.ReactNode;
} & ViewProps) {
  if (!LinearGradientNative) {
    return <View style={style}>{children}</View>;
  }
  return (
    <LinearGradientNative colors={colors} start={start} end={end} style={style} {...rest}>
      {children}
    </LinearGradientNative>
  );
}
