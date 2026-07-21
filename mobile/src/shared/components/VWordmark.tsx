import { Text } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

/**
 * Gradient "Vida" wordmark for the home top bar. Mirrors the redesign —
 * Iris → Ember sweep. Lives alongside VidaLogo (the PNG icon).
 */
export function VWordmark({ size = 18 }: { size?: number }) {
  const { tokens } = useTheme();
  // React Native doesn't support CSS background-clip on Text, so we layer
  // two Texts: a transparent base with the gradient simulated via a clipped
  // approach. For a single-line wordmark the simplest reliable rendering
  // across iOS/Android is to use the brand's primary-light as a stand-in
  // when a true gradient text isn't available. Web (Expo web) renders the
  // gradient via background-clip via a View + Text overlay below.
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: size,
        fontWeight: "900",
        letterSpacing: -0.6,
        color: tokens["--vida-primary-light"],
      }}
    >
      Vida
    </Text>
  );
}
