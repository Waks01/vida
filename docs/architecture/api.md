# Vida — API Surface (FastAPI)

> Mirrors `vida-design.html` §7. Routers are THIN — they parse input, call a
> `services/` method, return a Pydantic schema. All auth/sensitive routes require
> JWT; purchases & payouts additionally require a verified PIN token.

## Base
- Prefix: `/api/v1`. Docs: `/docs`, `/redoc` (debug-only in prod).
- CORS: explicit `EXPO_PUBLIC_` frontend origins allowlist (never `*` in prod).
- Auth: **JWT** (python-jose). Access + refresh with rotation. PIN (bcrypt) gates login + sensitive actions.

## Endpoints
| Group | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| auth | POST | `/auth/signup` | none | email+password → 6-digit email OTP via Resend (dev returns `dev_otp`) |
| auth | POST | `/auth/verify-otp` | none | → JWT |
| auth | POST | `/auth/login` | none | email+password fallback |
| auth | POST | `/auth/pin/set` | JWT | bcrypt `pin_hash` |
| auth | POST | `/auth/pin/verify` | none | PIN → JWT (login) |
| auth | POST | `/auth/refresh` | refresh | rotate |
| content | GET | `/series` | opt | paginated catalog (ordered by views) |
| content | GET | `/series/{id}` | opt | detail + episodes (eager-loaded) |
| discovery | GET | `/trending` | none | top 20 by `total_views` (also at `/content/trending`) |
| discovery | GET | `/search?q=` | opt | title substring match (also at `/content/search`) |
| content | GET | `/episodes/{id}/stream` | JWT | playable HLS URL. `source=stream` → signed Cloudflare Stream URL (3600s); `source=external` → stored public URL returned as-is (0s) |
| content | POST | `/episodes/{id}/unlock` | JWT | `{method: coins|subscription|ad}` |
| content | POST | `/episodes/{id}/watch` | JWT | 15s playback heartbeat (Phase 1: accepted, no-op persist) |
| content | POST | `/episodes/upload` | JWT + creator | multipart video → Cloudflare Stream + Episode row |
| coins | GET | `/wallet/balance` | JWT | |
| coins | GET | `/wallet/packs` | none | pack products (NGN packs) |
| coins | GET | `/wallet/transactions` | JWT | ledger history (`CoinTransactionPublic[]`) |
| coins | POST | `/ads/complete` | JWT | AdMob callback → +coins (cooldown/daily cap) |
| coins | POST | `/checkin/daily` | JWT | → +100 |
| payments | POST | `/payments/initialize` | JWT + PIN | `{provider, product_id, amount}` → provider session |
| payments | POST | `/payments/confirm` | JWT + PIN | confirm w/ PIN → provider SDK charge |
| payments | POST | `/payments/webhook` | provider sig | Paystack/Stripe/Google Pay events (sig-verified) |
| payments | GET | `/payments/methods` | JWT | saved methods (`PaymentMethodPublic[]`) |
| payments | POST | `/subscription/cancel` | JWT + PIN | cancel VIP |
| creators | POST | `/creators/series` | JWT + creator | create series (`pending`) |
| creators | POST | `/creators/episodes/upload-url` | JWT + creator | Cloudflare Stream direct-upload ticket (`EpisodeUploadUrlResponse`) |
| creators | POST | `/creators/apply` | JWT | |
| creators | GET | `/creators/earnings` | JWT | breakdown (65% share) |
| creators | POST | `/creators/payout/request` | JWT + PIN | min $50 → bank via Paystack/Stripe |
| admin | GET | `/admin/metrics` | admin (`is_admin`) | platform stats |
| admin | GET | `/admin/content/pending` | admin | pending approvals |
| admin | POST | `/admin/content/{id}/approve` | admin | approve series + its episodes |
| admin | POST | `/admin/users/{id}/adjust-coins` | admin + PIN | admin coin adjust |
| admin | POST | `/admin/episodes/import` | admin | import third-party (external) episode: `{series_id, title, hls_url, ...}` → `EpisodePublic` (`source=external`) |

## Payment flow (3 PSPs behind one `payment_service`)
1. Client picks pack + method (Paystack / Stripe / Google Pay) + enters PIN.
2. `POST /payments/initialize {provider, product_id, amount, pin}` →
   returns provider token (Paystack auth_url, Stripe client_secret, GP token).
3. Provider SDK charges on-device/in-sheet.
4. Provider POSTs to `/payments/webhook` with `x-provider` header (signature-verified).
5. Service credits coins / activates VIP / records `payments` row (`pin_verified=true`).

## Change log
- 2026-07-18 — Synced from `vida-design.html` §7; confirmed async FastAPI
  + Pydantic v2 + webhook-verified PSPs (no manual SQL in prod).
- 2026-07-18 — Phase 1 backend endpoints implemented and wired. Auth (incl.
  /refresh, Redis-backed OTP store with in-memory fallback, Resend email in
  staging/prod and `dev_otp` returned in local), content (series/trending/search
  ordered by views + eager-loaded episodes, episode stream with Cloudflare Stream
  signed HLS URL, unlock by coins/subscription/ad with daily cap, watch heartbeat
  accepted, multipart upload gated to JWT+creator that persists an Episode row),
  wallet (balance/packs/transactions/ads/checkin with cooldown+daily cap),
  payments (initialize/confirm/webhook/methods with PIN-gated Paystack+Stripe+
  Google Pay SDKs), users/me, creators (apply/earnings/payout + R2 presigned
  upload-url), and admin router (metrics/content-pending/approve/adjust-coins,
  all `is_admin`-gated). Coin ledger is append-only with atomic balance snapshots.
  `boto3` + `python-multipart` added for R2 presign + multipart upload.
- 2026-07-18 — Known Phase 1 deviations: `/trending` and `/search` are also
  exposed at API root (`/api/v1/trending`, `/api/v1/search`) per design §7 in
  addition to `/content/...`; `/episodes/upload` returns the created Episode id;
  subscription create/status endpoints are NOT part of Phase 1 (only cancel);
  watch heartbeat persists no-op in Phase 1.
