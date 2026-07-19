/**
 * Vida theme tokens — 6 DaisyUI-style themes.
 *
 * Mirrors `docs/vida-design.html` §1 (DaisyUI themes). Each theme is a flat
 * record of CSS custom properties applied via `document.body[data-theme]`.
 * `useTheme` (src/shared/hooks/useTheme.ts) sets the attribute and persists the
 * choice to `users.theme_preference` (MMKV + backend).
 *
 * Brand: primary = #7c3aed (vida purple), accent/coin = #f59e0b (amber).
 */
export type ThemeName =
  | "dark"
  | "light"
  | "cupcake"
  | "cyberpunk"
  | "sunset"
  | "valentine";

export const THEME_ORDER: ThemeName[] = [
  "dark",
  "light",
  "cupcake",
  "cyberpunk",
  "sunset",
  "valentine",
];

export interface ThemeTokens {
  "--vida-bg": string;
  "--vida-surface": string;
  "--vida-surface-2": string;
  "--vida-surface-3": string;
  "--vida-primary": string;
  "--vida-primary-dark": string;
  "--vida-primary-light": string;
  "--vida-accent": string;
  "--vida-accent-dark": string;
  "--vida-text-primary": string;
  "--vida-text-muted": string;
  "--vida-text-dim": string;
  "--vida-border": string;
  "--shadow-glow": string;
  "--shadow-coin": string;
}

const BRAND_PRIMARY = "#7c3aed";
const BRAND_PRIMARY_DARK = "#6d28d9";
const BRAND_PRIMARY_LIGHT = "#a78bfa";
const BRAND_ACCENT = "#f59e0b";
const BRAND_ACCENT_DARK = "#d97706";

export const THEMES: Record<ThemeName, ThemeTokens> = {
  dark: {
    "--vida-bg": "#1e1e2e",
    "--vida-surface": "#2a2a3a",
    "--vida-surface-2": "#3d3d4d",
    "--vida-surface-3": "#4a4a5c",
    "--vida-primary": BRAND_PRIMARY,
    "--vida-primary-dark": BRAND_PRIMARY_DARK,
    "--vida-primary-light": BRAND_PRIMARY_LIGHT,
    "--vida-accent": BRAND_ACCENT,
    "--vida-accent-dark": BRAND_ACCENT_DARK,
    "--vida-text-primary": "#c2c2d6",
    "--vida-text-muted": "#9a93b0",
    "--vida-text-dim": "#6b6b8c",
    "--vida-border": "#3d3d4d",
    "--shadow-glow": "0 0 20px rgba(124, 58, 237, 0.45)",
    "--shadow-coin": "0 0 14px rgba(245, 158, 11, 0.3)",
  },
  light: {
    "--vida-bg": "#ffffff",
    "--vida-surface": "#f2f2f2",
    "--vida-surface-2": "#e5e6e6",
    "--vida-surface-3": "#d7d7d7",
    "--vida-primary": BRAND_PRIMARY,
    "--vida-primary-dark": BRAND_PRIMARY_DARK,
    "--vida-primary-light": BRAND_PRIMARY_LIGHT,
    "--vida-accent": BRAND_ACCENT,
    "--vida-accent-dark": BRAND_ACCENT_DARK,
    "--vida-text-primary": "#1f2937",
    "--vida-text-muted": "#5b5570",
    "--vida-text-dim": "#9a93b0",
    "--vida-border": "#e5e6e6",
    "--shadow-glow": "0 0 16px rgba(124, 58, 237, 0.2)",
    "--shadow-coin": "0 0 14px rgba(245, 158, 11, 0.3)",
  },
  cupcake: {
    "--vida-bg": "#faf7f5",
    "--vida-surface": "#f2e9e3",
    "--vida-surface-2": "#e5d5ca",
    "--vida-surface-3": "#d8c8b8",
    "--vida-primary": "#65c3f3",
    "--vida-primary-dark": "#3b82f6",
    "--vida-primary-light": "#a5d8f5",
    "--vida-accent": "#eeaf3a",
    "--vida-accent-dark": "#d97706",
    "--vida-text-primary": "#41291d",
    "--vida-text-muted": "#7a5b4c",
    "--vida-text-dim": "#a98a78",
    "--vida-border": "#e5d5ca",
    "--shadow-glow": "0 0 16px rgba(101, 195, 243, 0.3)",
    "--shadow-coin": "0 0 14px rgba(238, 175, 58, 0.35)",
  },
  cyberpunk: {
    "--vida-bg": "#0a0a0f",
    "--vida-surface": "#18181f",
    "--vida-surface-2": "#2a2a3a",
    "--vida-surface-3": "#3a3a4a",
    "--vida-primary": "#ff7597",
    "--vida-primary-dark": "#db2777",
    "--vida-primary-light": "#f9a8d4",
    "--vida-accent": "#00d8d6",
    "--vida-accent-dark": "#0891b2",
    "--vida-text-primary": "#f4f4f8",
    "--vida-text-muted": "#b0b0c0",
    "--vida-text-dim": "#7a7a8c",
    "--vida-border": "#2a2a3a",
    "--shadow-glow": "0 0 22px rgba(255, 117, 151, 0.5)",
    "--shadow-coin": "0 0 16px rgba(0, 216, 214, 0.45)",
  },
  sunset: {
    "--vida-bg": "#1a0e1a",
    "--vida-surface": "#2a1626",
    "--vida-surface-2": "#3a2034",
    "--vida-surface-3": "#4a2840",
    "--vida-primary": "#f472b6",
    "--vida-primary-dark": "#db2777",
    "--vida-primary-light": "#f9a8d4",
    "--vida-accent": "#fb923c",
    "--vida-accent-dark": "#ea580c",
    "--vida-text-primary": "#ffeaf6",
    "--vida-text-muted": "#e0a8c8",
    "--vida-text-dim": "#b07a98",
    "--vida-border": "#5a2e50",
    "--shadow-glow": "0 0 20px rgba(244, 114, 182, 0.4)",
    "--shadow-coin": "0 0 16px rgba(251, 146, 60, 0.45)",
  },
  valentine: {
    "--vida-bg": "#fee7ef",
    "--vida-surface": "#f6d6e3",
    "--vida-surface-2": "#e7b8cb",
    "--vida-surface-3": "#dba6c2",
    "--vida-primary": "#e96d7b",
    "--vida-primary-dark": "#c94a5a",
    "--vida-primary-light": "#f4a6b4",
    "--vida-accent": "#f4c6b6",
    "--vida-accent-dark": "#e0a106",
    "--vida-text-primary": "#451526",
    "--vida-text-muted": "#9a5b68",
    "--vida-text-dim": "#b07a88",
    "--vida-border": "#e7b8cb",
    "--shadow-glow": "0 0 16px rgba(233, 109, 123, 0.35)",
    "--shadow-coin": "0 0 14px rgba(244, 198, 182, 0.45)",
  },
};

export const DEFAULT_THEME: ThemeName = "dark";
