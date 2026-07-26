# Backend — Persona API

NestJS 11 API for the Persona platform. See [../CLAUDE.md](../CLAUDE.md) for the monorepo overview.

## Stack

- **Framework**: NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **ORM**: Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`)
- **Database**: PostgreSQL 18 (via Docker)
- **Auth**: `@nestjs/jwt` with a hand-rolled `JwtAuthGuard` (no passport-jwt/passport-local); `@nestjs/passport` is used only for Google OAuth (`passport-google-oauth20`). Refresh tokens persisted in DB (HMAC-hashed), `bcryptjs` (salt rounds from `BCRYPT_SALT_ROUNDS` in [src/common/security.ts](src/common/security.ts), currently **10**)
- **Rate limiting**: `@nestjs/throttler` — global IP-keyed guard (`APP_GUARD`), tighter `@Throttle` on auth routes, and a per-user `UserThrottlerGuard` ([src/common/user-throttler.guard.ts](src/common/user-throttler.guard.ts)) on LLM-cost routes (chat send, recommendations reset)
- **Validation**: `class-validator` + `class-transformer` through a custom pipe (see [src/pipes/validation.pipe.ts](src/pipes/validation.pipe.ts))
- **Mail**: `@nestjs-modules/mailer` + `nodemailer` + Handlebars templates
- **i18n**: `nestjs-i18n` (en/ru, resolved from `Accept-Language`; thin `t()`/`getLang()` wrappers in [src/i18n/translate.ts](src/i18n/translate.ts))
- **AI**: OpenRouter via `@openrouter/sdk` ([src/ai/ai.service.ts](src/ai/ai.service.ts)); prompts live in [src/ai/prompts/](src/ai/prompts/)
- **API docs**: Swagger at `/api/docs` (`@nestjs/swagger`)
- **Runtime**: Node 22 (per [Dockerfile](Dockerfile)), TypeScript 5.7

## Scripts

From [package.json](package.json):

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Watch mode. `cross-env` sets `NODE_ENV=development`, which makes `ConfigModule` load `.env.development`. |
| `npm run start:prod` | Runs `dist/src/main` with `NODE_ENV=production` (loads `.env.production`). Build first. |
| `npm run build` | `nest build` → `dist/` |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Jest. `rootDir: src`, `testRegex: .*\.spec\.ts$`. **No spec files exist yet** — `npm test` currently fails with "no tests found". |
| `npm run test:e2e` | Jest with `./test/jest-e2e.json`. |
| `npm run lint` | ESLint with `--fix`. |
| `npm run format` | Prettier on `src/**/*.ts` and `test/**/*.ts`. |

There is **no `db:migrate` script** — run the Prisma CLI directly:

```sh
npx prisma migrate dev --name <change>   # create + apply a migration in dev
npx prisma migrate deploy                # apply pending migrations (prod)
npx prisma generate                      # regenerate the client after schema edits
```

Prisma config lives in [prisma.config.ts](prisma.config.ts). Schema and migrations are under [prisma/](prisma/).

## Prisma — easy-to-miss details

- **The generated client output is `generated/prisma/`, not `node_modules/@prisma/client`.** Imports inside the app come from the local `generated/` directory — don't change that without updating every importer.
- Models in [prisma/schema.prisma](prisma/schema.prisma): `User`, `RefreshToken`, `OtpCode`, `Test`, `TestQuestion`, `TestResult`, `TestProgress` (chunked-test progress), `Portrait`, `RecommendationItem`, `Friendship`, `Compatibility`, `Chat`, `ChatMessage`, `Subscription` (Persona Pro / Paddle — one row per user). `TestResult` has a unique constraint on `[userId, testId]` — one result per (user, test) pair.
- `Test.questions` and `TestResult.result` are `Json` columns; the question shape is enforced at the application layer (see [src/tests/models/](src/tests/models/)), not at the DB.
- The Schwartz values test's `testType` is the (load-bearing) typo `shcwartz` — see the quirks list in [../CLAUDE.md](../CLAUDE.md).

## Module layout

Feature-based, under [src/](src/):

- [src/auth/](src/auth/) — `auth.controller`, `auth.service`, `google.strategy.ts`, `refresh-token.repository.ts`, `guards/{jwt-auth,google-auth}.guard.ts`, DTOs, `config/google-oauth.config.ts`
- [src/users/](src/users/) — `users.service`, `user.repository.ts` (no controller — user routes live under `auth`), `models/user.entity.ts`
- [src/tests/](src/tests/) — `tests.controller`, `tests.service` (implements `OnModuleInit` to seed tests on boot), `test-scoring.service.ts`, repositories (`test`, `test-result`, `test-progress`), DTOs, `models/`, mappers, and **[src/tests/tests.seed.ts](src/tests/tests.seed.ts)** (~11k lines — the six question banks: IQ, Big Five, Schwartz (`shcwartz`), ECR-R, COPE, PID-5; do not hand-edit lightly)
- [src/portrait/](src/portrait/) — the AI cross-test portrait: status-machine `GET /portrait` (locked/generating/ready), background generation deduped via `SingleFlight`
- [src/friends/](src/friends/) — friendships (requests/invite links) + the pair `Compatibility` analysis (`compatibility.service.ts`)
- [src/recommendations/](src/recommendations/) — the film/book swipe queue: LLM batch generation + catalog enrichment ([catalog.service.ts](src/recommendations/catalog.service.ts): TMDB / Google Books / Open Library)
- [src/chat/](src/chat/) — AI chats (portrait & compatibility kinds), replies stream over SSE; only the last `CHAT_HISTORY_WINDOW` messages go into the model prompt. Sends are gated by `SubscriptionsService.assertCanSendMessage` — past `FREE_MESSAGE_LIMIT` (2, global across chats) a send returns **402 `SUBSCRIPTION_REQUIRED`** before anything streams or persists
- [src/subscriptions/](src/subscriptions/) — Persona Pro (Paddle Billing): `GET config`/`GET me`, `POST sync` (confirms a finished checkout — verifies the transaction via the Paddle API when `PADDLE_API_KEY` is set; **sandbox without a key trusts the client**, production refuses), `POST cancel`/`resume` (scheduled change at period end), and the signature-verified `POST webhook` (HMAC over the raw body — `main.ts` boots with `rawBody: true`). Entitlement = status TRIALING/ACTIVE/PAST_DUE, with a lazy re-fetch from Paddle when the paid period lapses (covers no-webhook local setups)
- [src/ai/](src/ai/) — `ai.service.ts` (OpenRouter client, completions + streaming) and all prompt builders under `prompts/`. Model routing: `OPENROUTER_MODEL` everywhere, except the first-test portrait (`OPENROUTER_MODEL_FIRST`), the all-tests portrait (`OPENROUTER_MODEL_COMPLETE`) and chat replies within the free allowance (`OPENROUTER_MODEL_FREE`) — each falls back to `OPENROUTER_MODEL` when unset
- [src/mail/](src/mail/) — `mail.service`, `otp-code.repository.ts` (interface) + `otp-code.prisma.repository.ts` (implementation), Handlebars templates, OTP signing
- [src/common/](src/common/) — `single-flight.ts` (in-process dedup of concurrent generations), `user-throttler.guard.ts` (per-user rate limit for LLM routes), `security.ts` (`BCRYPT_SALT_ROUNDS`)
- [src/i18n/](src/i18n/) — `translate.ts` (`t()`/`getLang()`) + `en`/`ru` dictionaries for errors and mail
- [src/pipes/validation.pipe.ts](src/pipes/validation.pipe.ts) — custom `ValidationPipe`. Uses `plainToClass` + `validate` with `whitelist: true` and `forbidNonWhitelisted: true`. Use **this**, not the Nest built-in.
- [src/exceptions/validation.exception.ts](src/exceptions/validation.exception.ts) — paired exception type
- [src/prisma.service.ts](src/prisma.service.ts) — top-level Prisma client wrapper

`AppModule` ([src/app.module.ts](src/app.module.ts)) imports the ten feature modules above plus `ConfigModule.forRoot({ isGlobal: true, envFilePath: \`.env.${process.env.NODE_ENV}\` })`, `ThrottlerModule` (global rate limit, bound as `APP_GUARD`) and `I18nModule`.

## Conventions

- **File names**: kebab-case with role suffix — `auth.controller.ts`, `add-profile-info.dto.ts`, `jwt-auth.guard.ts`, `test-result.mapper.ts`.
- **Class names**: PascalCase, suffix matches kind — `AuthController`, `UsersService`, `JwtAuthGuard`, `UserDto`, `TestMapper`.
- **Repository pattern**: define an interface, register the implementation under a DI token, inject with `@Inject(TOKEN)`. The mail module is the canonical example — mirror [src/mail/otp-code.repository.ts](src/mail/otp-code.repository.ts) (interface) + [src/mail/otp-code.prisma.repository.ts](src/mail/otp-code.prisma.repository.ts) (Prisma impl) when adding a new repo.
- **DTOs**: validated via `class-validator` decorators (`@IsEmail`, `@IsString`, `@Length`, `@IsOptional`, `@IsBoolean`). Run them through the custom `ValidationPipe` — that's what enforces `whitelist`/`forbidNonWhitelisted`.
- **Mappers** convert entities → response DTOs. See [src/tests/mappers/](src/tests/mappers/).

## Auth model

- Access JWT (`JWT_ACCESS_SECRET`) + refresh token (`JWT_REFRESH_SECRET`); refresh tokens are also persisted in the `RefreshToken` table and signed with a separate secret (`JWT_REFRESH_DB_SECRET`) before storage.
- Passwords hashed with **bcryptjs**, salt rounds from `BCRYPT_SALT_ROUNDS` ([src/common/security.ts](src/common/security.ts), currently 10). Old hashes stay valid after a cost change — bcrypt embeds the cost in the hash.
- Password reset OTP signed with HMAC-SHA256 using `RESET_CODE_SECRET`, sent via email.
- Google OAuth via `GoogleStrategy` + `GoogleAuthGuard`. Callback URL configured by `GOOGLE_CALLBACK_URL`.

## Config & env

`ConfigModule` is global. The env file is selected by `NODE_ENV` — `.env.${NODE_ENV}` (e.g. `.env.development`, `.env.production`).

Required variables (visible in `.env.development`):

```
PORT
DATABASE_URL
POSTGRES_HOST  POSTGRES_USER  POSTGRES_DB  POSTGRES_PASSWORD  POSTGRES_PORT
JWT_ACCESS_SECRET  JWT_REFRESH_SECRET  JWT_REFRESH_DB_SECRET
RESET_CODE_SECRET
EMAIL_USER  EMAIL_PASSWORD
GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET  GOOGLE_CALLBACK_URL
FRONTEND_URL
OPENROUTER_API_KEY  OPENROUTER_MODEL  OPENROUTER_MODEL_COMPLETE  OPENROUTER_MAX_TOKENS
OPENROUTER_MODEL_FIRST  OPENROUTER_MODEL_FREE
TMDB_API_KEY  GOOGLE_BOOKS_API_KEY
PADDLE_ENV  PADDLE_CLIENT_TOKEN  PADDLE_PRICE_WEEKLY  PADDLE_PRICE_MONTHLY
```

Paddle server-side secrets (optional in sandbox — see [src/subscriptions/paddle.config.ts](src/subscriptions/paddle.config.ts)): `PADDLE_API_KEY` (checkout verification, cancel/resume; without it sandbox trusts the client and production refuses) and `PADDLE_WEBHOOK_SECRET` (signature check for `POST /subscriptions/webhook`).

Optional: `TRUST_PROXY=<hops>` (prod behind a reverse proxy — e.g. `1` for a single
nginx). Makes `req.ip`, and therefore the rate limiter, see the real client IP.
Leave unset when nothing proxies the API: trusting `X-Forwarded-For` without a
proxy lets clients spoof their IP past the throttler (see [src/main.ts](src/main.ts)).

## TypeScript

[tsconfig.json](tsconfig.json): `target: ES2022`, `module: nodenext`, `moduleResolution: nodenext`, `experimentalDecorators` + `emitDecoratorMetadata` on, `esModuleInterop` on, `incremental` on, `outDir: ./dist`. **Strictness is partial**: `strictNullChecks: true` but `noImplicitAny: false`, `strictBindCallApply: false`. No path aliases.

## Docker

### Local — [docker-compose.yml](docker-compose.yml) + [Dockerfile](Dockerfile)

Two services:

- **`main`** — built from [Dockerfile](Dockerfile) (node:22-alpine). Reads `.env.development`. Mounts `.:/app` (with an anonymous volume on `node_modules`) for hot reload, runs `npm run start:dev`. Exposes `5000:5000`. Depends on `postgres`.
- **`postgres`** — `postgres:18`. Reads `.env.development`. `5432:5432`. Volume `pgdata:/var/lib/postgresql`.

Both restart on failure.

### Server — [docker-compose.prod.yml](docker-compose.prod.yml) + [Dockerfile.prod](Dockerfile.prod)

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

**No Postgres container** — the DB is external, `DATABASE_URL` from the env file points at it. Services:

- **`migrate`** — one-shot `npx prisma migrate deploy`, built from the `builder` **stage** of [Dockerfile.prod](Dockerfile.prod) (the runtime stage has no Prisma CLI of its own). `api` waits on it via `condition: service_completed_successfully`.
- **`api`** — the runtime stage: `node dist/src/main` as the unprivileged `node` user, `PORT` pinned to 5000 in-container and published as `${APP_PORT:-5000}`. Healthcheck GETs `/api/docs`.

[Dockerfile.prod](Dockerfile.prod) build order is `npm ci` → `npx prisma generate` → `npm run build`; **generate must precede build** because the Nest sources import the client from `generated/prisma`. Easy to miss: the runtime stage also copies `src/i18n` and `src/mail/templates`, because both are loaded from `process.cwd() + '/src/...'` at runtime (see [src/app.module.ts](src/app.module.ts) and [src/mail/mail.module.ts](src/mail/mail.module.ts)) and are therefore *not* part of `dist/`.

Both compose files read the same `.env.development` (gitignored — create it on the server; `.env.production` is stale). Test seeding still happens on boot via `TestsService.onModuleInit`, so there's no separate seed step.
