import { TextInput, Text, View, type TextInputProps } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

interface VInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  style?: TextInputProps["style"];
}

/** Themed text input. See vida-design.html §2 "Input". */
export function VInput({ label, error, style, ...rest }: VInputProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? (
        <Text style={{ color: tokens["--vida-text-muted"], marginBottom: 6, fontSize: 13 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        placeholderTextColor={tokens["--vida-text-dim"]}
        style={[
          {
            height: 48,
            borderRadius: 12,
            paddingHorizontal: 14,
            backgroundColor: tokens["--vida-surface"],
            borderWidth: 1,
            borderColor: error ? "#ef4444" : tokens["--vida-border"],
            color: tokens["--vida-text-primary"],
            fontSize: 15,
          },
          style,
        ]}
      />
      {error ? (
        <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
