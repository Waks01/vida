# Vida

Short-form **vertical drama** platform with a **watch-to-earn coin economy**. Users watch
1-minute dramas, earn coins, and spend them to unlock premium episodes (or buy
coins / VIP via **Paystack, Stripe, or Google Pay**). Creators earn a **70/30** share.

> This repository holds the visual design system, the documentation/steering tree,
> and the **implementation** in `mobile/` (Expo SDK 56) + `backend/` (FastAPI).
> See `docs/architecture/plan.md` for the build roadmap.

## Quick links
| Doc | What it is |
| --- | --- |
| [`vida-design.html`](vida-design.html) | **Live design system** — brand, 12+ components, 6 DaisyUI themes, every screen, architecture, data flows, API, DB schema, roadmap. Source of truth for UI. |
| [`themes-preview.html`](themes-preview.html) | DaisyUI theme chooser used to pick the 6 shipped themes. |
| [`docs/steering/context.md`](docs/steering/context.md) | Product context + non-negotiable rules. **Read first.** |
| [`docs/steering/tech-stack.md`](docs/steering/tech-stack.md) | Pinned 2026 stack & versions (Expo SDK 56, FastAPI async, etc.). |
| [`docs/steering/conventions.md`](docs/steering/conventions.md) | Repo conventions: organization, terminal-only deps, sync docs. |
| [`docs/architecture/plan.md`](docs/architecture/plan.md) | 16-week phased build plan. |
| [`docs/architecture/structure.md`](docs/architecture/structure.md) | Canonical folder trees (mobile + backend). |
| [`docs/architecture/api.md`](docs/architecture/api.md) | FastAPI endpoint surface + payment flow. |
| [`docs/architecture/database.md`](docs/architecture/database.md) | PostgreSQL schema (Alembic). |
| [`docs/agent/spec.md`](docs/agent/spec.md) | **Agent coding spec** — what the coding agent may / must not do. |

## Stack (pinned — see `docs/steering/tech-stack.md`)
- **Mobile:** Expo SDK 56 (RN 0.85, React 19.2) · Expo Router · TypeScript strict ·
  Zustand + TanStack Query + MMKV · custom 6-theme token system (constants/theme.ts).
- **Backend:** FastAPI · async SQLAlchemy 2.0 (`postgresql+asyncpg://`) · Alembic ·
  Pydantic v2 · PostgreSQL 16 · Redis · `uv`.
- **Media/Payments/Ads:** Cloudflare R2+Stream · Paystack + Stripe + Google Pay ·
  AdMob rewarded.

## Non-negotiable product rules
1. **Closed coin economy** — no cash payout to end users.
2. **Email auth + 6-digit email OTP + bcrypt transaction PIN** (PIN gates login + purchases/payouts).
3. **3 PSPs only:** Paystack, Stripe, Google Pay.
4. **Vertical swipeable player** (Reels/Shorts style).
5. **6 themes** (dark default, light, cupcake, cyberpunk, sunset, valentine), per-user persisted.

## Conventions (short version)
- Organize by **feature**, not just file type. One home per file.
- Add deps / scaffold **via terminal only** (`npx create-expo-app`, `uv add`, `npx expo install`).
- **Production-ready, no outdated code/libs.** If research supersedes a tool, use the current one.
- **Keep docs in sync** — any change to UI/API/DB/structure updates the matching doc + `vida-design.html`.

---
_Generated 2026-07-18. Docs are living files: update the relevant one whenever a
decision changes (see each file's Change log)._
"# vida" 
