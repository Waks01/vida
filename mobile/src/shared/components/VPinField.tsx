import { useState } from "react";
import { TextInput, View } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

interface VPinFieldProps {
  length?: number;
  onComplete: (code: string) => void;
  secure?: boolean;
}

/** Segmented digit entry for OTP (6) and transaction PIN (4-6). */
export function VPinField({ length = 6, onComplete, secure = true }: VPinFieldProps) {
  const { tokens } = useTheme();
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [focused, setFocused] = useState(0);

  function setAt(index: number, char: string) {
    const next = [...values];
    next[index] = char.slice(-1);
    setValues(next);
    if (char && index < length - 1) setFocused(index + 1);
    if (next.every((c) => c !== "")) onComplete(next.join(""));
  }

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {values.map((v, i) => (
        <TextInput
          key={i}
          value={v}
          onChangeText={(t) => setAt(i, t)}
          onFocus={() => setFocused(i)}
          maxLength={1}
          keyboardType="number-pad"
          secureTextEntry={secure}
          autoFocus={i === 0}
          style={{
            width: 44,
            height: 52,
            borderRadius: 12,
            textAlign: "center",
            fontSize: 20,
            color: tokens["--vida-text-primary"],
            backgroundColor: tokens["--vida-surface"],
            borderWidth: 1,
            borderColor: focused === i ? tokens["--vida-primary"] : tokens["--vida-border"],
          }}
        />
      ))}
    </View>
  );
}
