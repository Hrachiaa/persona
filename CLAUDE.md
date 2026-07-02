# Persona

Personality / IQ testing platform. Users sign up (email + password or Google OAuth), fill out a profile, take six psychological tests (IQ, Big Five, Schwartz values, ECR-R attachment, COPE, PID-5), and get an AI-generated portrait, friend compatibility, AI chats and book/film recommendations built from the results.

## Repo layout

Two **independent** npm packages — there is no root `package.json`, no workspace tool (no pnpm/yarn workspaces, no turbo, no nx):

- [backend/](backend/) — NestJS 11 + Prisma 7 + PostgreSQL API. See [backend/CLAUDE.md](backend/CLAUDE.md).
- [frontend/](frontend/) — Vite 7 + React 19 SPA (plain JS, not TS). See [frontend/CLAUDE.md](frontend/CLAUDE.md).

Each package has its own `node_modules`, lockfile, ESLint config, and scripts. **Always `cd` into the package before running anything** — there is no root command runner.

## Running locally

```sh
# Backend (Postgres + API on :5000)
cd backend && docker compose up

# Frontend (Vite dev server, proxies /api/* → backend)
cd frontend && npm run dev
```

Frontend talks to backend via the Vite proxy at `/api/*`. Override with `VITE_API_URL` if pointing at a non-default backend.

## API contract between the two packages

There is **no shared types package and no codegen**. The frontend hand-writes request/response shapes inside [frontend/src/api/](frontend/src/api/) (`auth.js`, `tests.js`). When you change a backend DTO or response shape, update the matching frontend API module in the same change — nothing will catch the drift for you.

## Git

- Default branch is **`develop`** (not `main`). PRs target `develop`.
- Recent feature branches follow `feature/<area>/<topic>` (e.g. `feature/tests/iq`, `feature/signup-login`).

## Quirks worth knowing before "fixing" them

- **Frontend navigation uses `react-router-dom` v7** — routes are declared in [frontend/src/App.jsx](frontend/src/App.jsx), each screen/tab has its own URL. See [frontend/CLAUDE.md](frontend/CLAUDE.md#routing) for the route table.
- **`backend/src/users/models/user.enity.ts`** has a typo (`enity`, missing `t`). Renaming touches every importer of `UserEntity`; treat it as a separate task, not a cleanup.
- **The frontend is plain JavaScript.** `@types/react` is in devDependencies for editor hints only — there is no `tsconfig.json` and no TS compile step. Don't add `.ts`/`.tsx` files without converting the project deliberately.
