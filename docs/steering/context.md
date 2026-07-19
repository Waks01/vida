# Vida — Product & Project Context

> Single source of truth for what Vida is, who it is for, and the north-star decisions that
> shape every build choice. Keep this file short and stable; link to deeper docs for detail.

## What Vida is
Vida is a **short-form vertical drama platform** (1-minute episodes) with a **watch-to-earn
coin economy**. Users watch dramas, earn coins, and spend coins to unlock premium
episodes — or buy coin packs / VIP via real payments. Creators upload vertically-shot
dramas and earn a **70/30 revenue share** (70% to creator).

## Non-negotiable product rules
- **No cash payouts to end users.** The coin economy is closed: coins → episode
  unlocks only. Creators are the only ones paid, via Paystack / Stripe to bank.
- **Auth is email-based, not phone.** Email + password, verified by a 6-digit email
  OTP. A **4–6 digit transaction PIN** (bcrypt) is required to log in and to
  approve any sensitive action (purchases, payouts, PIN change).
- **Payments use Paystack + Stripe + Google Pay** only. No other PSPs.
- **Player is vertical, swipeable, reels-style** (swipe up = next episode, down = previous),
  like YouTube Shorts / Facebook Reels / TikTok.
- **4 switchable themes** ship from day one: `dark` (default), `light`, `cupcake`,
  `cyberpunk`, `sunset`, `valentine` — real DaisyUI v5 tokens, persisted per user.

## Target market
English-speaking mobile-first audiences; strong fit for Africa / South-Asia / LatAm where
vertical dramas (DramaBox / ReelShort style) are exploding. iOS + Android via Expo,
plus a web PWA for the Creator Portal and Admin.

## Current phase
Phase 0 — foundations in progress. `backend/` has a working FastAPI layered
skeleton (auth + content endpoints, SQLAlchemy 2.0 models, Alembic, Docker,
CI; lint + pytest green). `mobile/` holds the Expo SDK 56 scaffold
(auth flow, 6-theme system, vertical swipe player, shared components, route
tree). See `docs/architecture/plan.md` for the full roadmap + change log.

## Source-of-truth files
| File | Purpose |
| --- | --- |
| `vida-design.html` | Live design system: brand, components, 6 themes, all screens, architecture, data flows, API, DB schema, roadmap |
| `themes-preview.html` | DaisyUI theme picker used to choose the 6 shipped themes |
| `docs/steering/*.md` | Agent + human steering files (this file is the root) |
| `docs/architecture/plan.md` | Implementation roadmap + decisions |
| `docs/agent/spec.md` | What the coding agent may / may not do |
