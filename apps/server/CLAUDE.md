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

Run a single test file or test name:

```bash
pnpm jest src/app.controller.spec.ts
pnpm jest -t "should return \"Hello World!\""
```

## Architecture

- Standard NestJS module structure: `src/app.module.ts` wires `AppController`/`AppService` plus `PrismaModule`, `AuthModule`, and `MeetingsModule`; `src/main.ts` bootstraps, applies a global `ValidationPipe({ whitelist: true, transform: true })`, and listens. New features should follow the same controller/service/module split.
- **Database**: Prisma (pinned to v6 — v7 requires Node 22.12+, this repo runs 22.11) talks to the Postgres container defined in the root `docker-compose.yml`. Schema lives at `prisma/schema.prisma`; migrations in `prisma/migrations/`. `PrismaService` (`src/prisma/prisma.service.ts`) extends `PrismaClient` and is provided by a `@Global()` `PrismaModule`, so any module can inject it without re-importing. Connection config comes from `apps/server/.env` (`DATABASE_URL`, `JWT_SECRET` — gitignored, not committed) loaded via `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`.
  - After changing `schema.prisma`: `pnpm prisma migrate dev --name <name>` (regenerates the client too), or `pnpm prisma generate` alone if only the client needs regenerating.
- **Auth**: `src/auth/` — `AuthController` exposes `POST /auth/register` and `POST /auth/login` (both return `{ accessToken }`); `AuthService` hashes passwords with `bcrypt` and signs JWTs via `@nestjs/jwt` (`JwtModule.registerAsync` reads `JWT_SECRET` from `ConfigService`, 1h expiry). DTOs (`RegisterDto`, `LoginDto`) use `class-validator` decorators — validation only fires because of the global `ValidationPipe`, so e2e tests must configure the same pipe on their `TestingModule` (they don't get `main.ts`'s bootstrap for free).
- **Meetings**: `src/meetings/` — `MeetingsController` exposes `POST /meetings`, `GET /meetings`, `GET /meetings/:id` (404 via `NotFoundException` when the id doesn't exist). `MeetingsService` talks to `PrismaService`'s `meeting` model (`title: String`, `date: DateTime`, `participants: String[]` — a native Postgres array, no join table). `CreateMeetingDto` validates `title` (non-empty string), `date` (`@IsISO8601()`), `participants` (array of strings, empty array allowed).
- Jest config for unit tests lives inline in `package.json` (`rootDir: "src"`, matches `*.spec.ts`). E2E tests live under `test/` with their own config (`test/jest-e2e.json`) and boot a full Nest application (e.g. `test/app.e2e-spec.ts`, `test/auth.e2e-spec.ts`, `test/meetings.e2e-spec.ts`) rather than testing a controller in isolation. These hit the real Postgres container (no mocking) and use unique/generated data per test instead of resetting DB state between runs.
- ESLint runs `typescript-eslint`'s `recommendedTypeChecked` plus `eslint-plugin-prettier/recommended`, meaning Prettier violations surface as ESLint errors here (unlike the client app, which uses `eslint-config-prettier` instead). Prettier's actual rules come from the repo root (`../../.prettierrc.json`) — there is no per-app `.prettierrc`.
- Jest's `expect.any(...)` matchers are typed `any`, which trips `@typescript-eslint/no-unsafe-assignment` when used inside an object literal passed to `toEqual`. Prefer separate assertions (e.g. `expect(Object.keys(body)).toEqual([...])` + `expect(typeof body.x).toBe('string')`) over `toEqual({ x: expect.any(String) })`.

## Keeping this file current

If the module structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
