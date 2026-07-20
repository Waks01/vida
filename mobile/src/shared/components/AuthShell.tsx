import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";
import { VIcon, type VIconName } from "./VIcon";
import { VidaLogo } from "./VidaLogo";

/** Centered auth/onboarding screen shell. vida-design.html §2 auth screens. */
export function AuthShell({
  step,
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  step?: string;
  icon?: VIconName;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: tokens["--vida-bg"],
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 24,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <VidaLogo size={84} />
        <Text style={{ color: tokens["--vida-primary"], fontSize: 28, fontWeight: "900", letterSpacing: 0.5, marginTop: 4 }}>
          Vida
        </Text>
      </View>

      <View style={{ paddingBottom: 24, alignItems: "center" }}>
        {step ? (
          <Text style={{ fontSize: 11, color: tokens["--vida-text-dim"], letterSpacing: 1, marginBottom: 8 }}>
            {step}
          </Text>
        ) : null}
        {icon ? <VIcon name={icon} size={40} color={tokens["--vida-primary"]} /> : null}
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: icon ? 12 : 0 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4, textAlign: "center" }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>{children}</View>

      {footer ? <View style={{ marginTop: "auto", paddingTop: 24, alignItems: "center" }}>{footer}</View> : null}
    </ScrollView>
  );
}
