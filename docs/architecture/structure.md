# Vida — Folder Structure (canonical)

> Authoritative code-organization tree for both apps. Mirrors `docs/steering/conventions.md`
> ("project organization is a priority"). One home per file; feature-based, not type-sprawl.

## Mobile (`mobile/` — Expo SDK 56, `src/` layout)
```
mobile/
├── app/                        # Expo Router — routes ONLY (thin shells)
│   ├── _layout.tsx              # global providers, theme, query client
│   ├── (unauthenticated)/
│   │   ├── _layout.tsx          # redirect to home if logged in
│   │   ├── index.tsx            # splash → onboarding
│   │   ├── login.tsx            # email+password fallback
│   │   ├── signup.tsx
│   │   ├── verify-otp.tsx
│   │   └── pin-login.tsx
│   ├── (authenticated)/
│   │   ├── _layout.tsx          # AUTH GUARD: redirect to /pin-login if no session
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # bottom nav: Home / Search / Wallet / Me
│   │   │   ├── index.tsx          # Home (feed)
│   │   │   ├── search.tsx
│   │   │   ├── wallet.tsx
│   │   │   └── profile.tsx
│   │   ├── series/[id].tsx       # Series detail
│   │   ├── player.tsx            # VERTICAL SWIPE feed
│   │   ├── payment-method.tsx
│   │   ├── pin-verify.tsx        # purchase confirmation
│   │   ├── history.tsx
│   │   ├── my-list.tsx
│   │   ├── notifications.tsx
│   │   ├── settings.tsx
│   │   ├── creator/
│   │   │   ├── apply.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── upload.tsx
│   │   │   └── payout.tsx
│   │   └── (auth)/
│   │       ├── pin-setup.tsx
│   │       └── change-pin.tsx
│   └── +api/                     # optional Expo API routes (server code)
├── src/
│   ├── features/                 # business logic, one folder per domain
│   │   ├── auth/                  # email OTP, PIN, session, biometrics
│   │   │   ├── components/          # login form, otp field, pin field
│   │   │   ├── hooks/               # useAuth, useSession
│   │   │   ├── api/                 # authApi.ts (wraps core/httpClient)
│   │   │   └── types.ts
│   │   ├── feed/                  # home, trending, search, series detail
│   │   ├── player/                # vertical swipe feed, progress heartbeat
│   │   ├── wallet/                # coins, packs, history, ads, payments
│   │   ├── creators/             # apply, upload, dashboard, payout
│   │   └── profile/              # settings, theme, notifications
│   ├── shared/                   # used by 2+ features
│   │   ├── components/           # VButton, VInput, VPinField, VBadge,
│   │   │                         #   VSeriesCard, VEpisodeRow, VBottomNav,
│   │   │                         #   VSheetModal, VSwipePlayer, VPaymentRow,
│   │   │                         #   VCoinPack, VToast  (see vida-design.html §2)
│   │   ├── hooks/                # useTheme, useNetworkStatus, useDebounce
│   │   ├── utils/                # formatDate, formatCurrency
│   │   └── constants/            # routes, query keys
│   ├── core/                     # infrastructure (no business logic)
│   │   ├── api/                  # httpClient.ts (axios/fetch + interceptors),
│   │   │                         #   queryClient.ts (TanStack + MMKV persister)
│   │   ├── storage/              # mmkv.ts, secureStore.ts (tokens, PIN ref)
│   │   ├── payments/            # paystack.ts, stripe.ts, googlePay.ts wrappers
│   │   ├── ads/                 # admob.ts
│   │   └── config/              # env.ts (EXPO_PUBLIC_* typed)
│   └── providers/               # ThemeProvider, QueryProvider, AuthProvider, PaymentProvider
├── assets/
├── constants/theme.ts            # 6 DaisyUI theme tokens (mirror vida-design.html §3)
├── app.json  eas.json  tsconfig.json  package.json  babel.config.js
└── tests/                       # co-located *.test.ts preferred
```

**Direction rule:** `app/` imports from `src/features/`. `features/` imports from
`shared/` + `core/`. Nothing imports from `app/`. One direction, no cycles.

**Theming:** `constants/theme.ts` exports the 6 DaisyUI token sets (dark/light/cupcake/
cyberpunk/sunset/valentine), identical to `vida-design.html` §3. `useTheme`
sets `document.body[data-theme]` and persists `users.theme_preference` (Context + MMKV).

## Backend (`backend/` — FastAPI, `src/` layout)
```
backend/
├── alembic/                    # async-aware env, versions/
├── src/app/
│   ├── main.py                 # app factory + lifespan (DB connect/dispose)
│   ├── api/
│   │   ├── deps.py             # Annotated[Depends(...)] aliases (get_db, get_current_user)
│   │   ├── router.py           # top /api router
│   │   └── v1/
│   │       ├── router.py         # v1 aggregator
│   │       └── endpoints/        # auth.py, content.py, watch.py, payments.py,
│   │                            #   ads.py, creators.py, users.py, admin.py  (THIN)
│   ├── core/
│   │   ├── config.py         # Pydantic Settings (fails fast on missing env)
│   │   ├── security.py        # JWT (python-jose), bcrypt PIN, token rotation
│   │   ├── exceptions.py     # AppException hierarchy
│   │   ├── exception_handlers.py
│   │   ├── middleware.py      # request-id, access log
│   │   └── lifespan.py
│   ├── db/
│   │   ├── base.py           # DeclarativeBase + naming convention
│   │   ├── session.py        # async engine + sessionmaker + get_session
│   │   └── models/           # users, series, episodes, coin_transactions,
│   │                            #   payments, ad_views, creators, subscriptions
│   ├── schemas/              # Pydantic v2 request/response models
│   ├── repositories/         # data access ONLY (BaseRepository + per-domain)
│   ├── services/              # business logic (coin ledger, payment orchestration,
│   │                            #   ad fraud, Cloudflare Stream direct-upload tickets)
├── tests/                      # conftest.py (async client + ephemeral DB), unit/, integration/
├── Dockerfile  docker-compose.yml  pyproject.toml  alembic.ini  .env.example
└── README.md
```

**Layering:** endpoints parse → call service → service raises `AppException` →
repository builds SQL. Models (ORM) ≠ Schemas (Pydantic); never leak ORM past service.
Driver MUST be `postgresql+asyncpg://` (not `postgresql://`).

## Why this shape
- Feature folders give each domain one home → no merge conflicts, easy onboarding.
- Thin routes + service/repo split → testable without HTTP or a live DB.
- `core/` holds infra so features stay portable (swap PSP, mock API in tests).
- Matches 2026 consensus (Expo official `src/` + features; FastAPI layered boilerplates).
