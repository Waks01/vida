import { useState, useRef, useCallback } from "react";
import { TextInput, View, type TextInput as RNTextInput } from "react-native";

import { useTheme } from "../../providers/ThemeProvider";

interface VPinFieldProps {
  length?: number;
  onComplete: (code: string) => void;
  secure?: boolean;
}

export function VPinField({ length = 6, onComplete, secure = true }: VPinFieldProps) {
  const { tokens } = useTheme();
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [focused, setFocused] = useState(0);
  const refs = useRef<RNTextInput[]>([]);

  const focusAt = useCallback((index: number) => {
    const target = Math.max(0, Math.min(index, length - 1));
    setFocused(target);
    refs.current[target]?.focus();
  }, [length]);

  const distribute = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, length);
    const next = Array(length).fill("");
    for (let i = 0; i < digits.length; i++) {
      next[i] = digits[i];
    }
    setValues(next);
    if (digits.length > 0) {
      const focusIndex = Math.min(digits.length, length - 1);
      onComplete(next.join(""));
      setTimeout(() => focusAt(focusIndex), 0);
    }
  }, [length, onComplete, focusAt]);

  const handleChange = useCallback((index: number, text: string) => {
    const raw = text.replace(/\D/g, "");
    if (raw.length > 1) {
      distribute(raw);
      return;
    }
    const next = [...values];
    next[index] = raw.slice(-1);
    setValues(next);
    if (raw) {
      onComplete(next.join(""));
      if (index < length - 1) focusAt(index + 1);
    } else {
      onComplete(next.join(""));
    }
  }, [values, length, onComplete, focusAt, distribute]);

  const handleKeyPress = useCallback((index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace" && !values[index] && index > 0) {
      focusAt(index - 1);
    }
  }, [values, length, focusAt]);

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {values.map((v, i) => (
        <TextInput
          key={i}
          ref={(ref) => { if (ref) refs.current[i] = ref; }}
          value={v}
          onChangeText={(t) => handleChange(i, t)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused((f) => (f === i ? f : i))}
          maxLength={1}
          keyboardType="number-pad"
          secureTextEntry={secure}
          onKeyPress={(e) => handleKeyPress(i, e)}
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={{
            width: 48,
            height: 56,
            borderRadius: 12,
            textAlign: "center",
            fontSize: 22,
            color: tokens["--vida-text-primary"],
            backgroundColor: tokens["--vida-surface"],
            borderWidth: 2,
            borderColor: focused === i ? tokens["--vida-primary"] : tokens["--vida-border"],
          }}
        />
      ))}
    </View>
  );
}
