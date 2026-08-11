# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start:dev    # nest start --watch
pnpm build        # nest build
pnpm start:prod   # node dist/main (run build first)
pnpm lint         # eslint --fix over src/apps/libs/test
pnpm test         # jest (unit tests, *.spec.ts colocated under src/)
pnpm test:e2e     # jest --config ./test/jest-e2e.json
pnpm test:cov     # jest with coverage
```

Run a single test file or test name (there are currently no unit `*.spec.ts` files — coverage lives in the e2e suite):

```bash
pnpm test:e2e -- test/auth.e2e-spec.ts
pnpm test:e2e -- -t "rejects an incorrect password with 401 Unauthorized"
```

## Architecture

- Standard NestJS module structure: `src/app.module.ts` wires `PrismaModule`, `AuthModule`, `UsersModule`, and `MeetingsModule` (no root `AppController`/`AppService` — the boilerplate `GET /` "Hello World" route was removed since nothing in the app used it); `src/main.ts` bootstraps, applies a global `ValidationPipe({ whitelist: true, transform: true })`, and listens. New features should follow the same controller/service/module split.
- **Database**: Prisma (pinned to v6 — v7 requires Node 22.12+, this repo runs 22.11) talks to the Postgres container defined in the root `docker-compose.yml`. Schema lives at `prisma/schema.prisma`; migrations in `prisma/migrations/`. `PrismaService` (`src/prisma/prisma.service.ts`) extends `PrismaClient` and is provided by a `@Global()` `PrismaModule`, so any module can inject it without re-importing. Connection config comes from `apps/server/.env` (`DATABASE_URL`, `JWT_SECRET` — gitignored, not committed) loaded via `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`.
  - After changing `schema.prisma`: `pnpm prisma migrate dev --name <name>` (regenerates the client too), or `pnpm prisma generate` alone if only the client needs regenerating.
- **Users**: `src/users/` — `UsersService` is the only place that touches Prisma's `user` model. `findByEmail(email)` reads; `create(email, password)` hashes the password with `bcrypt` internally before persisting, so callers never handle raw hashing — a caller can't accidentally store a plaintext password by going through this service. No controller (nothing public-facing needs it yet); `UsersModule` just exports `UsersService` for other modules (currently only `AuthModule`) to import.
- **Auth**: `src/auth/` — owns authentication/authorization only, not user data. `AuthController` exposes `POST /auth/register` and `POST /auth/login` (both return `{ accessToken }`); `AuthService` calls `UsersService` for lookup/creation, verifies the password on login with `bcrypt.compare` (password _verification_ stays here since it's a credential check, whereas password _hashing_ on creation lives in `UsersService` — see above), and signs JWTs via `@nestjs/jwt` (`JwtModule.registerAsync` reads `JWT_SECRET` from `ConfigService`, 1h expiry). DTOs (`RegisterDto`, `LoginDto`) use `class-validator` decorators — validation only fires because of the global `ValidationPipe`, so e2e tests must configure the same pipe on their `TestingModule` (they don't get `main.ts`'s bootstrap for free). `AuthModule` imports `UsersModule` and also provides/exports `JwtModule` and `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`) so other modules can protect routes without redefining JWT config — import `AuthModule` and `@UseGuards(JwtAuthGuard)` on the controller. The guard expects `Authorization: Bearer <token>` and rejects with 401 if missing/invalid; on success it sets `request.user = { sub, email }`.
- **CORS & dev port**: `main.ts` calls `app.enableCors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000' })` so the browser-based `apps/client` (fixed on :3000, see root `CLAUDE.md`) can call this API cross-origin. Since both apps default to port 3000, the local `.env` (gitignored) sets `PORT=3001` for this app in dev — `apps/client` points at it via `NEXT_PUBLIC_API_URL` (see `apps/client/CLAUDE.md`). If you change either app's dev port, update the other side's default to match.
- **Meetings**: `src/meetings/` — `MeetingsController` (guarded by `JwtAuthGuard`, so all three routes require a valid access token) exposes `POST /meetings`, `GET /meetings`, `GET /meetings/:id` (404 via `NotFoundException` when the id doesn't exist, 401 via the guard when unauthenticated). `MeetingsService` talks to `PrismaService`'s `meeting` model (`title: String`, `date: DateTime`, `participants: String[]` — a native Postgres array, no join table). `CreateMeetingDto` validates `title` (non-empty string), `date` (`@IsISO8601()`), `participants` (array of strings, empty array allowed).
- Jest config for unit tests lives inline in `package.json` (`rootDir: "src"`, matches `*.spec.ts`; `test` script passes `--passWithNoTests` since there are currently no unit spec files — add one back if a module gains logic worth unit-testing in isolation). E2E tests live under `test/` with their own config (`test/jest-e2e.json`) and boot a full Nest application (`test/auth.e2e-spec.ts`, `test/meetings.e2e-spec.ts`) rather than testing a controller in isolation. These hit the real Postgres container (no mocking) and use unique/generated data per test instead of resetting DB state between runs.
- ESLint runs `typescript-eslint`'s `recommendedTypeChecked` plus `eslint-plugin-prettier/recommended`, meaning Prettier violations surface as ESLint errors here (unlike the client app, which uses `eslint-config-prettier` instead). Prettier's actual rules come from the repo root (`../../.prettierrc.json`) — there is no per-app `.prettierrc`.
- Jest's `expect.any(...)` matchers are typed `any`, which trips `@typescript-eslint/no-unsafe-assignment` when used inside an object literal passed to `toEqual`. Prefer separate assertions (e.g. `expect(Object.keys(body)).toEqual([...])` + `expect(typeof body.x).toBe('string')`) over `toEqual({ x: expect.any(String) })`.

## Keeping this file current

If the module structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
