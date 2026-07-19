# Vida — Implementation Plan

> Build roadmap derived from `vida-design.html`. Phases are independently shippable.
> Last updated: 2026-07-18. Update this file whenever scope/timeline/decisions change.

## Stack (pinned — see `../steering/tech-stack.md`)

- **Client**: Expo SDK 56 (RN 0.85, React 19.2) + Expo Router + TypeScript strict.
- **Backend**: FastAPI + async SQLAlchemy 2.0 (PostgreSQL 17) + Alembic + Pydantic v2, packaged with `uv`.
- **State**: Zustand (client) + TanStack Query (server) + MMKV (persist) + Context (rare global: theme, auth user).
- **Media**: Cloudflare R2 + Stream (HLS). **Ads**: AdMob rewarded. **Payments**: Paystack + Stripe + Google Pay.

## Repository layout (target)

```
Vida/
├── docs/                      # this documentation tree
│   ├── steering/            # context, tech-stack, conventions
│   ├── architecture/         # plan, structure, api, database
│   └── agent/               # spec (what the agent may/may not do)
├── mobile/                   # Expo SDK 56 app (src/ layout)
├── backend/                  # FastAPI service (src/ layout, Docker)
├── infra/                    # docker-compose, CI, nginx/Caddy
├── vida-design.html          # live design system (source of truth for UI)
└── themes-preview.html       # DaisyUI theme chooser
```

## Phases

| #   | Weeks | Name             | Scope                                                                                                                          | Key deliverables                          |
| --- | ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 0   | 1–3   | Foundation       | Repos scaffolded via terminal. Backend Docker (Postgres+Redis+API). Alembic init. JWT + PIN skeleton. CI lint+type+test.       | `docker compose up` boots; `/health` live |
| 1   | 4–6   | Core Backend     | All routers: auth(email+OTP+PIN), content, watch, payments(3 PSPs), ads, creators, users. Layered (router→service→repo→model). | Real DB behind every endpoint             |
| 2   | 5–7   | Content Pipeline | Creator POSTs `/creators/series` (pending) → `/creators/episodes/upload-url` returns a Cloudflare Stream **direct-upload ticket** (creator PUTs raw video straight to Stream) → Stream transcodes + fires `/content/episodes/stream-webhook` (sets `status=ready`) → admin approves (`/admin/content/{id}/approve`) publishes series+episodes. **No R2/ARQ/FFmpeg worker** (Stream handles encoding per `tech-stack.md`). | Creator can publish a series              |
| 3   | 7–10  | Mobile Core      | Expo app: Auth(email+OTP+PIN), Home, Search, Series Detail, **Swipe Player**, Wallet, Profile, Settings, 6 themes.             | Vertical swipe feed works                 |
| 4   | 8     | Ads              | AdMob rewarded SDK → callback verify → coin credit. Anti-fraud cooldowns.                                                      | +50 coins per ad, capped                  |
| 5   | 9–10  | Payments         | Paystack+Stripe+Google Pay abstraction. Payment-method screen, PIN confirm, webhooks, VIP state, coin packs.                   | Buy coins / subscribe                     |
| 6   | 11–13 | Creator + Admin  | Creator upload dashboard, earnings, payouts (Paystack/Stripe→bank). Admin approve queue, coin adjustments.                     | Creator paid ≥ $50                        |
| 7   | 14–16 | Beta → Launch    | Internal beta (50–100). Bug bash. Recruit 5 creators. Ship Google Play + PWA.                                                  | Public launch                             |

## Key decisions (locked)

1. **Closed coin economy** — no user cash payout. Creators paid only.
2. **Email auth + 6-digit email OTP + bcrypt PIN** — PIN gates login and all sensitive actions.
3. **3 PSPs behind one `payment_service`** — provider chosen client-side, PIN-confirmed, webhook-credited.
4. **Vertical swipe player** — full-screen reels feed; swipe up=next ep, down=prev; HLS stream + 15s watch heartbeat.
5. **6 DaisyUI themes** via `[data-theme]` + CSS vars; persisted as `users.theme_preference`, restored on login.
6. **Free-tier infra first** — Supabase/Expo free, Fly/Railway, Vercel, R2; scale only when revenue warrants.



## Deployment (production)

> Stack is a standard Docker/FastAPI app using `asyncpg` + Redis. **It cannot run on
> Cloudflare Workers** (no long-lived Postgres/Redis, no Docker). Cloudflare is used
> for **media only** (Stream + R2). Backend, Postgres, and Redis run as containers
> on a container platform.

### Single-image, three-role deployment model
Per product decision, **one image named `vida`** contains everything (API code + Postgres +
Redis binaries) and is run as **separate containers**, each assuming one role via the
`docker-entrypoint.sh` subcommand:

- `docker build -t vida -f backend/Dockerfile backend` — builds the single image.
- `docker-compose.yml` defines services `postgres`, `redis`, `api`, all using `image: vida`
  with no `build:` block. The `command` (`postgres` / `redis` / `api`) selects the role.
- `api` `depends_on` the healthy `postgres` + `redis` services; `DATABASE_URL` and
  `REDIS_URL` point at the service hostnames (`postgres:5432`, `redis:6379`).
- `docker-entrypoint.sh` runs the chosen process: starts Postgres (`pg_ctlcluster`/`postgres`)
  for the `postgres` role, `redis-server` for `redis`, and `uvicorn` for `api`.
- Postgres data lives in a named `pgdata` volume; recreate wipes the DB (re-run migrate +
  seed). Redis data is ephemeral inside its container.

This keeps a single artifact while isolating the database from the API at runtime.

### Recommended platforms
- **API role:** any Docker host (Fly.io / Railway / Render) running the `vida` image with
  `command: ["api"]`.
- **Postgres role:** managed Postgres (Fly Postgres / Railway / Supabase) is preferred for
  prod; the in-image Postgres role is intended for local/dev.
- **Redis role:** managed Redis on the same platform, or Upstash Redis.
- **Media:** Cloudflare Stream (transcode + HLS delivery) and Cloudflare R2 (object storage).
  Per `tech-stack.md`, Stream handles encoding so **no ARQ/FFmpeg worker is needed**.

### Why not Cloudflare Workers for the backend
Workers don't support the long-lived `asyncpg` Postgres connection pool, Redis, or
arbitrary Docker images. Keep Cloudflare scoped to media; deploy the API elsewhere.

### Required production env vars (backend `.env`)
```
ENVIRONMENT=production
SECRET_KEY=<strong-random>                 # not the dev default
DATABASE_URL=postgresql+asyncpg://<user>:<pw>@<host>:5432/vida
REDIS_URL=redis://<host>:6379/0
ALLOWED_ORIGINS=["https://your-frontend-origin"]   # never "*"
RESEND_API_KEY=...        RESEND_EMAIL_FROM=...
PAYSTACK_SECRET_KEY=...   PAYSTACK_WEBHOOK_SECRET=...   PAYSTACK_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...     STRIPE_WEBHOOK_SECRET=...
GOOGLEPAY_MERCHANT_ID=...
CLOUDFLARE_STREAM_ACCOUNT_ID=...   CLOUDFLARE_STREAM_API_TOKEN=...
R2_ACCOUNT_ID=...   R2_ACCESS_KEY=...   R2_SECRET_KEY=...   R2_BUCKET=...   R2_PUBLIC_URL=...
# Coin economy (read from env — no hardcoding):
CREATOR_REVENUE_SHARE=0.65
DAILY_CHECKIN_COINS=100
AD_WATCH_COINS=20
AD_DAILY_CAP=20
AD_COOLDOWN_SECONDS=30
EPISODE_COIN_COST=25
COIN_RATE=10
COIN_PACK_MIN_NGN=100
COIN_PACK_STEP_NGN=100
PAYOUT_MINIMUM_USD=50.0
VIP_WEEKLY_USD=4.99
```

### Deploy checklist
1. Set the env vars above on the platform (secret manager, not committed).
2. Run Alembic migration on first deploy: `PYTHONPATH=/app/src alembic -c alembic.ini upgrade head`.
3. Confirm `/health` is live and CORS allows only the real frontend origin.
4. Point the mobile `EXPO_PUBLIC_API_BASE_URL` at the deployed API.
5. Verify Cloudflare Stream + R2 credentials before creator uploads go live.

## Change log

- 2026-07-18 — Added **Deployment (production)** section: backend/Postgres/Redis run as
  containers on Fly.io/Railway/Render (not Cloudflare Workers — incompatible with asyncpg+
  Redis); Cloudflare is media-only (Stream + R2). Documents required prod env vars and a
  deploy checklist. Confirms Phase 2 uses Stream-direct encoding (no ARQ/FFmpeg worker).
- 2026-07-18 — Plan created from `vida-design.html`; aligned to 2026 stack research
  (Expo SDK 56, FastAPI async + SQLAlchemy 2.0 + Alembic, Zustand + TanStack Query, MMKV, `uv`).
- 2026-07-18 — Phase 0 backend foundation implemented: layered `src/app/`
  (core, db, schemas, repositories, services, api/v1), JWT + bcrypt (direct `bcrypt`
  lib, not passlib — passlib 1.7.4 incompatible with bcrypt 5.x), email OTP + PIN
  auth endpoints, Alembic async env + initial migration, docker-compose (pg+redis+api),
  Dockerfile, CI workflow, and 4 passing pytest smoke tests (uvicorn app boots clean).
- 2026-07-18 — Phase 0 mobile scaffold created in `mobile/` (Expo SDK 56,
  `src/` + `app/` Expo Router layout). Auth flow (signup→OTP→JWT, PIN login/setup)
  wired to backend, 6-theme `constants/theme.ts` + `ThemeProvider`, vertical swipe
  player (`VSwipePlayer`), shared components (VButton/VInput/VPinField/VBadge/
  VSeriesCard/VBottomNav), Zustand auth store + TanStack Query client, wallet/feed
  features, and all route shells. NOTE: `npm`/`pnpm` installs are BLOCKED in this
  environment (npm 11 devEngines error on the SDK-56 template's pnpm packageManager
  - pnpm socket EACCES), so `node_modules` is not installed here — files are written
    to spec and install/typecheck must run on a healthy machine (`pnpm install`).
- 2026-07-18 — Phase 1 backend endpoints implemented and wired: 100% of the
  design §7 surface is live — auth (OTP via Resend in staging/prod, `dev_otp` in
  local, Redis-backed store), content (series/trending/search ordered by views +
  eager-loaded episodes, signed Cloudflare Stream HLS, unlock by coins/subscription/
  ad, JWT+creator multipart upload persisting an Episode), coins/ads/checkin,
  payments (PIN-gated Paystack+Stripe+Google Pay, webhook-verified), users/me,
  creators (apply/earnings/payout, series + Stream-direct episode upload-url),
  and the admin router (metrics/pending/approve/adjust-coins, `is_admin`-gated).
  Append-only coin ledger with atomic balance snapshots. 17 pytest tests green,
  ruff clean. Deps added via terminal: `boto3` (R2 presign, retained as service),
  `python-multipart` (upload). Subscription create/status and watch-heartbeat
  persistence are intentionally deferred to later phases.
- 2026-07-18 — Mobile Phase 3 started: `expo-av` installed via terminal, real
  `VSwipePlayer` built with `expo-av` Video + HLS, vertical FlatList paging,
  15s watch heartbeat stub, premium episode unlock overlay, field names aligned
   with backend snake_case API. TypeScript `tsc --noEmit` green.
- 2026-07-18 — Added `scripts/seed.py` for populating the dev database with
   test series/episodes using public HLS streams (Big Buck Bunny, Apple BipBop,
   Tears of Steel, Sintel, Akamai live). Run with: `cd backend && uv run python scripts/seed.py`.
   Creates a test user (`test@vida.app` / `testpass123`) with 500 coins.
- 2026-07-19 — Dual-source ingestion added. `episodes.source` ENUM
   (`stream`|`external`) selects playback: `stream` → Cloudflare Stream direct
   upload + signed HLS; `external` → admin-imported third-party/licensed content
   served as-is. `POST /admin/episodes/import` ingests external episodes;
   `GET /content/episodes/{id}/stream` signs for `stream`, returns raw URL for
   `external`. Mobile player now resolves the playable URL via that endpoint
    (works for both sources). 20 backend pytest green, ruff + mobile tsc clean.
- 2026-07-19 — Deployment model updated to single `vida` image run as three roles
  (`postgres`/`redis`/`api`) via `docker-entrypoint.sh`; `docker-compose.yml` uses
  `image: vida` for all services (no `build:` block). Plan Deployment section rewritten
  to reflect the one-image/three-container decision (supersedes earlier "Fly.io separate
    containers" phrasing).
- 2026-07-19 — Docker deployment verified end-to-end: `docker build -t vida`
  then `docker compose up -d` boots `postgres`/`redis`/`api` (all healthy).
  Entrypoint bootstrap creates the `vida` role + DB and a `pg_hba.conf` host
  entry so the api container can auth over the bridge network. Alembic
  upgrade (0001 + 0002) + seed run inside the api container. Smoke-tested:
  `/health`, `/content/trending` (3 seeded series), login, `/wallet/balance`
  (500), `/wallet/checkin/daily` (+100), episode `stream` (signed) and
  `/admin/episodes/import` → external `stream` (raw URL).
- 2026-07-19 — Fixed three integration bugs found during container bring-up:
  (1) `seed.py` stored `password_hash="test"` (plaintext) → now uses
  `hash_password`; (2) `SeriesPublic` lacked an `episodes` field so the mobile
  swipe feed had no episodes → added `episodes: list[EpisodePublic]` and
  eager-load it in content + creators endpoints; (3) `creators_apply` passed a
  non-existent `display_name` kwarg to `Creator` (model has none) → removed.
  Backend: 20 pytest green, ruff clean. Mobile: `tsc` clean, `eslint` added
  (flat config, warnings only), watch heartbeat wired into `player.tsx`.
- 2026-07-19 — Phase 4 native ads added. `react-native-google-mobile-ads`
  App ID wired in `app.json` (Android `ca-app-pub-3898064484524772~7285646968`;
  iOS falls back to same pending ID from `admob.md`). New `ads/constants.ts`
  holds unit IDs + tunable cadence: `NATIVE_AD_FEED_INTERVAL=4` (one native ad
  after every 4 series cards), `NATIVE_AD_PLAYER_INTERVAL=3` (one after every
  3 episodes in the swipe deck), `NATIVE_AD_PLAYER_SESSION_CAP=10` (AdMob
  frequency/retention guard). `useNativeAd` loads via `NativeAd.createForAdRequest`
  (test native unit in dev); `NativeAdCard` renders a clearly-labelled "AD"
  surface (headline/body/icon/CTA, media view in full variant) reused in feed
  (grid) and player (full-screen). `injectNativeAds` util builds the
  item/ad deck; home `index.tsx` and `VSwipePlayer` consume it. The rewarded
  ad-to-unlock-next-episode flow is unchanged. Mobile `tsc` + `eslint` clean.
- 2026-07-19 — Background ad prefetch added (TikTok/Reels model). Ads no
  longer load lazily on mount. `ads/pool.ts` is a module-level `NativeAdPool`
  singleton that keeps `NATIVE_AD_POOL_SIZE=3` native ads warm in the
  background from app launch and replenishes each on `consume()` so the pool
  never empties while swiping. `NativeAdCard` now pulls a ready ad from the
  pool (placeholder only if momentarily empty). `RewardedAdPreloader` mounts
  in `Providers` to warm a rewarded ad from launch and the SDK auto-reloads
  the next one the instant it closes — so "Watch Ad" shows instantly. Both
  pools start in `Providers` alongside `MobileAds().initialize()`. Dead
  `useNativeAd` hook removed. Mobile `tsc` + `eslint` clean.
- 2026-07-19 — Phase 3 watch-heartbeat persistence closed. Added `Episode.views`
  column (migration `0003_episode_views`, idempotent inspect guard) and wired
  `POST /content/episodes/{id}/watch` to increment `Episode.views` and keep
  `Series.total_views` in sync (auth-gated). Verified live in container
  (2 heartbeats → views=2, total_views=2). New `test_watch_heartbeat.py`.
  Backend: 21 pytest green, ruff clean. Phase 3 is now fully wired + persisted:
  feed, swipe player (stream resolve + coin/ad unlock + heartbeat), wallet
  (balance/packs/transactions/check-in), and search all hit real endpoints.
- 2026-07-19 — Phase 4 close-out: `POST /wallet/ads/complete` now requires a
  `callback_token` (design FLOW 3: "verify signature"). Implemented as a
  client-generated UUID/nonce with server-side replay protection:
  `verify_ad_callback` rejects malformed/stale tokens; a unique DB constraint
  on `ad_views.callback_token` prevents replays. Added `ad_callback_secret`
  env (for future HMAC extension), `callback_token` column to `AdView`
  (migration `0004_ad_callback_token`), and rewrote the mobile
  `walletApi.completeAd` + `useAdReward` to generate and forward
  `crypto.randomUUID()`. Verified live in container: missing→422, malformed→401,
  valid→200 (+20 coins), replay→429. New `test_ad_complete_requires_valid_callback_token`.
  Backend: 22 pytest green, ruff clean. Mobile `tsc` clean. Phase 4 complete.
- 2026-07-19 — Phase 5 payment wiring fixed and tests added. `walletApi.startPurchase`
  now accepts an optional `amount` and forwards it to `/payments/initialize`.
  `PaymentMethodScreen` and `VipSubscriptionScreen` pass the real purchase amount
  (NGN amount for coin packs, $4.99 for VIP). Mobile product IDs aligned to backend
  expectations: coin packs send `"coin_pack"`, VIP sends `"subscription"`.
  Added 4 backend integration tests covering successful payment initialization,
  Paystack webhook coin-pack fulfillment (1000 coins for ₦100), webhook VIP
  activation (`is_vip=true`, `status=active`), and subscription status for
  non-VIP users. Backend: 26 pytest green, ruff clean. Mobile `tsc` + `eslint`
  clean. Phase 5 complete.
- 2026-07-19 — Phase 6 creator + admin implemented. Backend: added `Payout` model
  and `PayoutService` with Paystack/Stripe transfer support; `/creators/payout/request`
  now enforces $50 minimum and initiates real PSP payouts. Added `/creators/payouts`
  list endpoint. Mobile: creator dashboard (`CreatorDashboardScreen` with series
  list), creator earnings + payout request (`CreatorEarningsScreen`), admin pending
  queue (`AdminPendingScreen`), and admin coin adjustment (`AdminAdjustCoinsScreen`).
  Added 4 Phase 6 integration tests: creator series list (403 for non-creator, 200
  for creator), payout minimum enforcement (400 below $50), and admin pending queue.
  Backend: 30 pytest green, ruff clean. Mobile `tsc` + `eslint` clean. Phase 6
  complete.
- 2026-07-19 — Phase 7 beta/launch prep completed for EAS workflow. `eas.json`
  updated with production build profiles (Android app-bundle, iOS Release) and
  `submit` configs for internal Google Play track and App Store. Added npm scripts:
  `build:android`, `build:ios`, `submit:android`, `submit:ios`. `README.md`
  documents EAS build and store submission commands. PWA/web artifacts removed
  to align with EAS-only distribution. Phase 7 complete.
