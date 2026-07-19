# Vida — Agent Coding Spec

> Authoritative "what the coding agent MAY and MUST NOT do" for the Vida codebase.
> Read `docs/steering/*` first. This file is enforced in CI + by the human reviewer.
> If a rule conflicts with reality, STOP and flag it — do not silently bypass.

## MUST — do these
1. **Read the design system first.** `vida-design.html` is the source of truth for
   brand, the 6 components, the 6 DaisyUI themes, all screens, API, and DB schema.
   `docs/architecture/*` is the source of truth for folder structure and the plan.
2. **Organize by feature.** Mobile: `mobile/src/features/<domain>/` owns its components,
   hooks, `api/`, types. Routes in `mobile/app/` are thin shells. Backend:
   `endpoints/` (thin) → `services/` → `repositories/` (SQL only) → `models/` (ORM).
3. **Pin to the researched stack.** Expo SDK 56, React Native 0.85, React 19.2, TypeScript
   strict, FastAPI + async SQLAlchemy 2.0 (`postgresql+asyncpg://`), Alembic, Pydantic v2,
   Zustand + TanStack Query + MMKV, `uv`. See `docs/steering/tech-stack.md`.
4. **Add deps / scaffold via terminal only.** `npx create-expo-app@latest --template
   default@sdk-56 <name>`, `npx expo install <pkg>`, `uv add <pkg>`. Never hand-edit
   `package.json` / `pyproject.toml` / lockfiles.
5. **Keep docs in sync.** Any change to structure, API, DB schema, or theme set updates the
   matching `docs/` file AND `vida-design.html`. Note the change + date.
6. **Production-ready code.** TypeScript `strict`, Pydantic `Settings` validated at startup,
   typed request/response, no `any`/`# type: ignore` without justification, error envelopes,
   tests co-located (`*.test.ts`, `tests/unit`, `tests/integration`).
7. **Respect product invariants** (from `docs/steering/context.md`): closed coin economy
   (no user cash payout), email auth + 6-digit email OTP + bcrypt PIN, 3 PSPs only
   (Paystack/Stripe/Google Pay), vertical swipe player, 6 themes persisted per user.

## MUST NOT — never do these
1. **Never import `@react-navigation/*`** in the Expo Router app — broken as of SDK 56.
   Use Expo Router's own APIs.
2. **Never use `postgresql://`** (sync) for the async engine — use `postgresql+asyncpg://`
   or you block the event loop.
3. **Never use Legacy RN Architecture** (removed in SDK 55); no `newArchEnabled`, no
   manual native Xcode/Android Studio config unless a required SDK is Expo-incompatible.
4. **Never manually `CREATE TABLE` / `ALTER TABLE` in prod** — always Alembic migration.
5. **Never put business logic in screens/route handlers.** Screens render + call hooks;
   endpoints parse → call service. No services touching SQLAlchemy directly (that's repositories' job).
6. **Never leak ORM types past the service boundary** — return Pydantic/`Create`/`Public` schemas.
7. **Never hand-edit dependency files** or lockfiles; never add a package not via the terminal.
8. **Never use outdated/deprecated libraries** (e.g. Redux instead of Zustand for solo client
   state, `create_all()` instead of Alembic, AdMob legacy APIs). Prefer the current 2026 stack.
9. **Never commit secrets.** `.env` is gitignored; `.env.example` is documented. Use
   `EXPO_PUBLIC_*` for client-exposed vars only.
10. **Never run git commit / push / amend** unless explicitly asked.
11. **Never dump files in root or a `misc/` folder.** If a file's home is unclear, ask.
12. **Never skip the hard rules for speed** — no `strict:false`, no `*` CORS in prod,
    no broad allowlists, no silent try/except swallowing real errors.

## Workflow (per task)
1. Confirm the task maps to `docs/architecture/plan.md` phase; if not, ask.
2. Scaffold/add deps via terminal. Follow `docs/architecture/structure.md` exactly.
3. Write the thin layer + the real logic in the feature/service/repository.
4. Add co-located tests. Run lint + type-check + tests before reporting done.
5. Update `vida-design.html` / `docs/` if the change touched UI, API, DB, or structure.
6. Report what changed and which docs were updated.

## Change log
- 2026-07-18 — Spec created from `vida-design.html` + 2026 stack research.
