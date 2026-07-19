# Vida — Project Conventions

> How we organize code, name things, and keep the repo healthy. Enforced by the
> agent spec (`docs/agent/spec.md`) and CI (Ruff, TSLint, type-check, tests).

## 1. Project organization is a priority
- Every file has exactly one clear home. If you cannot decide where a file goes,
  stop and ask — do not dump it in root or a `misc/` folder.
- Folder structure reflects **product domains (features)**, not just file type. See
  `docs/architecture/structure.md` for the canonical tree (Expo src/ + FastAPI src/).
- Keep app code in `src/`; keep config, scripts, and infra at the root level.

## 2. Adding dependencies — terminal only
- **Never** hand-edit `package.json`, `pyproject.toml`, or `requirements.txt`.
- Mobile: `npx expo install <pkg>` or `npm/yarn/pnpm/bun add <pkg>` from the
  mobile app directory.
- Backend: `uv add <pkg>` (uv) from the backend directory. Then commit the
  lockfile (`uv.lock` / `package-lock.json` / `yarn.lock` / `bun.lockb`).
- After adding a dep, run the relevant type-check + lint before committing.

## 3. Scaffolding — terminal only
- New Expo project: `npx create-expo-app@latest --template default@sdk-56 <name>`.
- New FastAPI service: scaffold under `src/app/` with the layered layout; do not
  copy-paste a boilerplate repo into root.
- Never create projects by dragging folders or manual file creation of whole trees.

## 4. Code quality (production-ready, no outdated code)
- **No deprecated APIs / libraries.** If research shows a library is unmaintained or
  a pattern is superseded (e.g. Legacy RN Architecture, `@react-navigation` in Expo
  Router, `create_all()` in prod), do NOT use it. Prefer the current 2026 stack
  in `docs/steering/tech-stack.md`.
- Keep components < ~300 lines; extract sub-components / hooks when they grow.
- Routes (Expo `app/`) stay thin: import from `features/`, render, done. Business
  logic lives in `features/<domain>/` (services, hooks, api).
- Backend: routers thin → call service → service calls repository → repository is the
  only place that builds SQL. Models = schema; Schemas (Pydantic) = wire format.
- TypeScript `strict: true` everywhere on mobile. Pydantic `Settings` validates config
  at startup and fails fast on missing env vars.

## 5. Documentation stays in sync
- Any change to architecture, folder layout, the API, the DB schema, or the theme
  set **must** update the matching doc. The design file `vida-design.html` is the
  live source for screens/components/themes/API/DB — update it too.
- If a decision reverses an earlier plan, update `docs/architecture/plan.md` AND
  note the change here or in the plan's change log.

## 6. Commits & safety
- Do not commit secrets/keys. Use `.env.example` + `.env` (gitignored).
- Run lint + type-check + tests before marking work complete.
- Never run `git commit` / `git push` / `git amend` unless explicitly asked.
