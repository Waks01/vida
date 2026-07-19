# Vida — Database Schema (PostgreSQL 16)

> Mirrors `vida-design.html` §8. Alembic-managed (async). Models in
> `backend/src/app/db/models/`; never `CREATE TABLE` by hand in prod.

## Conventions
- UUID PKs (`gen_random_uuid()`). `TIMESTAMPTZ` for all timestamps.
- `expire_on_commit=False` on the async session (avoids post-commit access errors).
- One migration per schema change; review autogenerate before applying.

## Tables
| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | `id` UUID PK · `email` UNIQUE NOT NULL · `password_hash` · `pin_hash` (bcrypt, NULL until set) · `display_name` · `coin_balance` INT DEFAULT 0 · `vip_until` TIMESTAMPTZ · **`theme_preference` VARCHAR DEFAULT 'dark'** (`dark|light|cupcake|cyberpunk|sunset|valentine`) · `is_creator` · `is_admin` · `created_at` | Email auth; theme restored on login |
| `series` | `id` · `creator_id` FK→users · `title` · `description` · `genre_id` FK · `thumbnail_url` · `status` ENUM(pending,published,rejected) · `total_views` BIGINT · `created_at` | |
| `episodes` | `id` · `series_id` FK · `episode_number` INT · `title` · `hls_url` · `thumbnail_url` · `stream_uid` VARCHAR(255) INDEX (Cloudflare Stream video id, for signed HLS) · **`source` ENUM(stream,external) DEFAULT 'stream'** · `duration_seconds` · `is_premium` BOOL DEFAULT TRUE · `coin_cost` INT DEFAULT 25 · `status` ENUM(ready,published,pending) | `source=stream`: creator upload via Cloudflare Stream (signed HLS). `source=external`: third-party/licensed content; `hls_url` is a public CDN URL served as-is |
| `coin_transactions` | `id` · `user_id` FK · `amount` INT (+credit/−debit) · `source` ENUM(ad_watch,episode_unlock,daily_checkin,coin_purchase,subscription,referral,admin_adjust) · `reference_id` UUID · `balance_after` INT snapshot · `created_at` | Immutable ledger; `balance_after` enforces invariant |
| `payments` | `id` · `user_id` FK · **`provider`** VARCHAR(`paystack|stripe|googlepay`) · `provider_ref` · `product_type`(`coin_pack|subscription`) · `amount` DECIMAL(10,2) · `currency` DEFAULT 'USD' · `status` ENUM(pending,success,failed,refunded) · `pin_verified` BOOL · `created_at` | One row per charge |
| `ad_views` | `id` · `user_id` FK · `ad_unit_id` · `device_id` · `coins_awarded` · `completed_at` | Fraud: 30s cooldown + daily cap |
| `creators` | `id` · `user_id` UNIQUE FK · `payout_method`(`paystack|stripe|bank`) · `payout_details` JSONB · `total_earnings` DECIMAL · `status` ENUM(pending,approved,rejected) | 65% share; payout min $50 |
| `subscriptions` | `id` · `user_id` FK · `status` ENUM(active,grace_period,expired,cancelled,refunded) · `provider`(`paystack|stripe|googlepay`) · `product_id` · `starts_at` · `expires_at` · `cancelled_at` | VIP state machine |

## Indexes (suggested)
- `users(email)`, `series(creator_id,status)`, `episodes(series_id,episode_number)`,
  `coin_transactions(user_id,created_at)`, `payments(provider,provider_ref)` UNIQUE,
  `ad_views(user_id,device_id,completed_at)`.

## Relationships
- `creator` 1:1 `user` (promoted). `series` N:1 `creator`/`user`.
- `episode` N:1 `series`. `coin_transaction` / `payment` / `ad_view` / `subscription` N:1 `user`.

## Change log
- 2026-07-18 — Synced from `vida-design.html` §8; added `users.theme_preference`
  (6-value enum) + `payments.provider` (3 PSPs). Async Alembic, UUID PKs.
- 2026-07-18 — Added `episodes.stream_uid` (VARCHAR(255), indexed) used by the
  Cloudflare Stream signed-HLS flow. OTP store moved to Redis (with in-memory
  fallback). Phase 1 + Phase 2 complete: auth, content, coins/ads/checkin,
  payments (3 PSPs), users/me, creators (series + Stream-direct episode
  upload-url via `stream-webhook`), and admin router all backed by real DB tables.
