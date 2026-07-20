import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { VButton } from "../../src/shared/components/VButton";
import { VIcon } from "../../src/shared/components/VIcon";
import { useTheme } from "../../src/providers/ThemeProvider";

const SLIDES = [
  {
    icon: "play-circle" as const,
    title: "Watch 1-Min Dramas",
    body: "Bite-sized vertical stories. Romance, thriller, fantasy — all addictive.",
  },
  {
    icon: "cash" as const,
    title: "Every Minute Earns",
    body: "Watch episodes, rack up coins. Your time literally pays off.",
  },
  {
    icon: "lock-open" as const,
    title: "Unlock With Coins",
    body: "Spend coins to open premium chapters — or go VIP for unlimited.",
  },
];

export default function Onboarding() {
  const { tokens } = useTheme();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], paddingTop: 60 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <VIcon name={slide.icon} size={56} color={tokens["--vida-primary"]} style={{ marginBottom: 16 }} />
        <Text
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: tokens["--vida-text-primary"],
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {slide.title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: tokens["--vida-text-muted"],
            textAlign: "center",
          }}
        >
          {slide.body}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
          paddingBottom: 16,
        }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === index ? tokens["--vida-primary"] : tokens["--vida-border"],
            }}
          />
        ))}
      </View>

      <View
        style={{
          padding: 24,
          flexDirection: "column",
          gap: 10,
        }}
      >
        <VButton
          variant="primary"
          fullWidth
          title={isLast ? "Get Started →" : "Next →"}
          onPress={() =>
            isLast
              ? router.replace("/(unauthenticated)/signup")
              : setIndex(index + 1)
          }
        />
        {!isLast && (
          <VButton
            variant="ghost"
            fullWidth
            title="Skip"
            onPress={() => router.replace("/(unauthenticated)/signup")}
          />
        )}
      </View>
    </View>
  );
}
