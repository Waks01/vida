import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { DEFAULT_THEME, THEMES, type ThemeName, type ThemeTokens } from "../constants/theme";
import { getStoredTheme, setStoredTheme } from "../core/storage/mmkv";

interface ThemeContextValue {
  theme: ThemeName;
  tokens: ThemeTokens;
  setTheme: (name: ThemeName) => void;
  available: ThemeName[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTokens(name: ThemeName): void {
  if (Platform.OS === "web") {
    const root = document.documentElement;
    root.setAttribute("data-theme", name);
    const tokens = THEMES[name];
    (Object.keys(tokens) as (keyof ThemeTokens)[]).forEach((key) => {
      root.style.setProperty(key, tokens[key]);
    });
  } else {
    // Native: set on the native view background via a context value consumed
    // by shared components. (No DOM — components read `tokens` directly.)
    void name;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(
    (getStoredTheme() as ThemeName) ?? DEFAULT_THEME
  );

  useEffect(() => {
    applyTokens(theme);
    setStoredTheme(theme);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    tokens: THEMES[theme],
    available: Object.keys(THEMES) as ThemeName[],
    setTheme: (name) => setThemeState(name),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
