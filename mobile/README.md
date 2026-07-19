# Vida — Mobile (Expo SDK 56)

Short-form vertical drama app with a watch-to-earn coin economy.

## Stack (pinned — see `../docs/steering/tech-stack.md`)
- **Expo SDK 56** · React Native 0.85 · React 19.2 · TypeScript (strict)
- **Expo Router** (file-based, `app/`) — **no `@react-navigation/*`** (per `docs/agent/spec.md`)
- **Zustand** (session/auth) + **TanStack Query** (server state) + **MMKV** (prefs) + **expo-secure-store** (tokens)
- Theming: 6 DaisyUI token sets in `constants/theme.ts`, applied via `useTheme` (`src/providers/ThemeProvider.tsx`)

## Structure
```
app/                 # routes ONLY (thin shells)
src/
  features/          # auth, feed, player, wallet, creators, profile
  shared/            # VButton, VInput, VPinField, VBadge, VSeriesCard, VBottomNav, hooks, utils
  core/              # httpClient, queryClient, mmkv, secureStore, env
  providers/         # ThemeProvider, Providers
constants/theme.ts  # 6 DaisyUI themes (mirror vida-design.html §1)
```

## Run
```bash
pnpm install        # or: npx expo install (do NOT hand-edit package.json)
pnpm start          # expo dev server
pnpm android / ios / web
```
> The backend (`./../backend`) must be running for live data; otherwise the app
> falls back to mock series in Phase 0 so the UI is exercisable offline.

## Notes
- `@/` alias → `src/` (see `babel.config.js` + `tsconfig.json` paths).
- Auth flow: signup → 6-digit email OTP → JWT; 4–6 digit bcrypt PIN for login
  and purchases (mirrors `backend/src/app/api/v1/endpoints/auth.py`).
- Vertical swipe player: `src/features/player/components/VSwipePlayer.tsx`
  (swipe up = next episode, down = previous).
- EAS builds: `eas.json` defines `production` build profiles and `submit`
  configs for internal Google Play track and App Store. Build with
  `eas build --platform android --profile production` or `eas build --platform ios --profile production`.
- Store submission: `eas submit --platform android --track internal` for Google Play
  internal testing; `eas submit --platform ios` for App Store TestFlight.
