# Backend — Persona API

NestJS 11 API for the Persona platform. See [../CLAUDE.md](../CLAUDE.md) for the monorepo overview.

## Stack

- **Framework**: NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **ORM**: Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`)
- **Database**: PostgreSQL 18 (via Docker)
- **Auth**: `@nestjs/jwt` + `@nestjs/passport` (passport-local, passport-jwt, passport-google-oauth20), refresh tokens persisted in DB, `bcryptjs` (salt rounds **8**)
- **Validation**: `class-validator` + `class-transformer` through a custom pipe (see [src/pipes/validation.pipe.ts](src/pipes/validation.pipe.ts))
- **Mail**: `@nestjs-modules/mailer` + `nodemailer` + Handlebars templates
- **API docs**: Swagger at `/api/docs` (`@nestjs/swagger`)
- **Runtime**: Node 22 (per [Dockerfile](Dockerfile)), TypeScript 5.7

## Scripts

From [package.json](package.json):

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Watch mode. `cross-env` sets `NODE_ENV=development`, which makes `ConfigModule` load `.env.development`. |
| `npm run start:prod` | Runs `dist/src/main` with `NODE_ENV=production` (loads `.env.production`). Build first. |
| `npm run build` | `nest build` → `dist/` |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Jest. `rootDir: src`, `testRegex: .*\.spec\.ts$`. |
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
- Models in [prisma/schema.prisma](prisma/schema.prisma): `User`, `RefreshToken`, `OtpCode`, `Test`, `TestQuestion`, `TestResult`. `TestResult` has a unique constraint on `[userId, testId]` — one result per (user, test) pair.
- `Test.questions` and `TestResult.result` are `Json` columns; the question shape is enforced at the application layer (see entities under [src/tests/entities/](src/tests/entities/)), not at the DB.

## Module layout

Feature-based, under [src/](src/):

- [src/auth/](src/auth/) — `auth.controller`, `auth.service`, `google.strategy.ts`, `refresh-token.repository.ts`, `guards/{jwt-auth,google-auth}.guard.ts`, DTOs, `config/google-oauth.config.ts`
- [src/users/](src/users/) — `users.controller`, `users.service`, `user.repository.ts`, DTOs, `models/user.enity.ts` *(yes, the file name has a typo — see [../CLAUDE.md](../CLAUDE.md))*
- [src/tests/](src/tests/) — `tests.controller`, `tests.service` (implements `OnModuleInit` to seed tests on boot), `test.repository.ts`, `test-result.repository.ts`, DTOs, entities, mappers, and **[src/tests/tests.seed.ts](src/tests/tests.seed.ts)** (~131 KB — the IQ/Szondi/Archetype/MBTI question banks; do not hand-edit lightly)
- [src/mail/](src/mail/) — `mail.service`, `otp-code.repository.ts` (interface) + `otp-code.prisma.repository.ts` (implementation), Handlebars templates, OTP signing
- [src/pipes/validation.pipe.ts](src/pipes/validation.pipe.ts) — custom `ValidationPipe`. Uses `plainToClass` + `validate` with `whitelist: true` and `forbidNonWhitelisted: true`. Use **this**, not the Nest built-in.
- [src/exceptions/validation.exception.ts](src/exceptions/validation.exception.ts) — paired exception type
- [src/prisma.service.ts](src/prisma.service.ts) — top-level Prisma client wrapper

`AppModule` ([src/app.module.ts](src/app.module.ts)) only imports the four feature modules + `ConfigModule.forRoot({ isGlobal: true, envFilePath: \`.env.${process.env.NODE_ENV}\` })`.

## Conventions

- **File names**: kebab-case with role suffix — `auth.controller.ts`, `add-profile-info.dto.ts`, `jwt-auth.guard.ts`, `test-result.mapper.ts`.
- **Class names**: PascalCase, suffix matches kind — `AuthController`, `UsersService`, `JwtAuthGuard`, `UserDto`, `TestMapper`.
- **Repository pattern**: define an interface, register the implementation under a DI token, inject with `@Inject(TOKEN)`. The mail module is the canonical example — mirror [src/mail/otp-code.repository.ts](src/mail/otp-code.repository.ts) (interface) + [src/mail/otp-code.prisma.repository.ts](src/mail/otp-code.prisma.repository.ts) (Prisma impl) when adding a new repo.
- **DTOs**: validated via `class-validator` decorators (`@IsEmail`, `@IsString`, `@Length`, `@IsOptional`, `@IsBoolean`). Run them through the custom `ValidationPipe` — that's what enforces `whitelist`/`forbidNonWhitelisted`.
- **Mappers** convert entities → response DTOs. See [src/tests/mappers/](src/tests/mappers/).

## Auth model

- Access JWT (`JWT_ACCESS_SECRET`) + refresh token (`JWT_REFRESH_SECRET`); refresh tokens are also persisted in the `RefreshToken` table and signed with a separate secret (`JWT_REFRESH_DB_SECRET`) before storage.
- Passwords hashed with **bcryptjs, salt rounds 8**.
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
```

## TypeScript

[tsconfig.json](tsconfig.json): `target: ES2022`, `module: nodenext`, `moduleResolution: nodenext`, `experimentalDecorators` + `emitDecoratorMetadata` on, `esModuleInterop` on, `incremental` on, `outDir: ./dist`. **Strictness is partial**: `strictNullChecks: true` but `noImplicitAny: false`, `strictBindCallApply: false`. No path aliases.

## Docker

[docker-compose.yml](docker-compose.yml) defines two services:

- **`main`** — built from [Dockerfile](Dockerfile) (node:22-alpine). Reads `.env.development`. Mounts `.:/app` (with an anonymous volume on `node_modules`) for hot reload, runs `npm run start:dev`. Exposes `5000:5000`. Depends on `postgres`.
- **`postgres`** — `postgres:18`. Reads `.env.development`. `5432:5432`. Volume `pgdata:/var/lib/postgresql`.

Both restart on failure.
