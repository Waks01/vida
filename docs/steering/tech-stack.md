# Vida — Tech Stack & Versions (pinned from research, 2026-07)

> Researched 2026-07-18. Update this file whenever a version or tool choice changes,
> and note the date + reason. Do NOT pin a version you have not verified is current.

## Mobile client (Expo / React Native)
| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Expo SDK 56** | Built on React Native 0.85, React 19.2, Hermes v1 default. New Architecture only (Legacy removed in SDK 55). |
| Router | **Expo Router** (file-based) | Independent as of SDK 56 — **do NOT import `@react-navigation/*`**; it is broken in Expo Router projects. |
| Language | **TypeScript** (strict) | Non-negotiable. `tsconfig.json` ships with the SDK 56 template; do not set `strict: false`. |
| Local/client state | **Zustand** | Minimal, no boilerplate. For UI toggles, modals, active tab, theme. |
| Server state | **TanStack Query (React Query)** | Caching, background refetch, optimistic updates. Replaces ~60% of what Redux would do. |
| Persisted state | **MMKV** | Auth tokens, user prefs, theme. SQLite (expo-sqlite) only if structured offline data > few thousand rows. |
| Secure storage | **expo-secure-store** | Access + refresh tokens, PIN hash reference. |
| Styling | **Unistyles** or StyleSheet w/ design tokens | Tokens map to the 6 DaisyUI themes via CSS variables (see `vida-design.html` §3). |
| Biometrics | **expo-local-authentication** | FaceID / fingerprint re-entry after PIN. |
| Video | **expo-av** (HLS via `expo-video`/native) | Vertical full-screen reels feed. |
| Push | **Expo Notifications** | Local + remote (FCM/APNs via EAS). |
| Ads | **Google Mobile Ads (AdMob)** | Rewarded video → coin reward. |
| Payments | **Paystack + Stripe + Google Pay** | Via their RN SDKs / web SDK inside Expo. |
| Tests | **Jest + React Native Testing Library** (unit/integration), **Detox** (E2E) | Co-locate `*.test.ts` next to source. |

## Backend (Python)
| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **FastAPI** (latest 0.11x line) | ASGI, OpenAPI-first. |
| Runtime / server | **Uvicorn** workers (or gunicorn+uvicorn) | Multi-worker in prod. |
| ORM | **SQLAlchemy 2.0** async (`AsyncSession`) | Use `postgresql+asyncpg://` driver — NOT `postgresql://` (blocks event loop). |
| Migrations | **Alembic** | Async-aware env. Run `alembic upgrade head` as a deploy step, not in app startup for prod multi-replica. |
| Validation | **Pydantic v2** | Separate `Create`/`Update`/`Public` schemas; never leak ORM types past the service boundary. |
| DB | **PostgreSQL 16** | Supabase free tier for dev → self-host later. |
| Cache / queue | **Redis** | Cooldown timers + ad caps; Stream handles encoding so no ARQ/FFmpeg worker needed |
| Auth | **JWT** (python-jose) + **bcrypt** PIN | Access + refresh token rotation. OTP via Resend. PIN gated by `require_pin` dependency. |
| Packaging | **uv** + `pyproject.toml` | Add deps via terminal (`uv add ...`), never hand-edit `requirements.txt`. |
| Container | **Docker + docker-compose** | API + Postgres + Redis with healthchecks. |
| Lint/format | **Ruff** | Pre-commit hooks; auto-format Alembic versions. |

## Infra / Hosting
- Backend: **Fly.io / Railway** (Docker, ~$0–5/mo at <1K MAU).
- Frontend PWA + Creator/Admin web: **Vercel** free tier.
- Media: **Cloudflare R2 + Stream** (zero-egress HLS encoding, thumbnail extract).
- Monitoring: **Sentry** (errors), **UptimeRobot** (uptime), **PostHog** (analytics, self-hostable).

## Change log
- 2026-07-18 — Initial pin from 2026 research (Expo SDK 56, RN 0.85, React 19.2,
  FastAPI async + SQLAlchemy 2.0 + Alembic, Zustand + TanStack Query, MMKV, uv).
