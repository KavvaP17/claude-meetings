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

- Standard NestJS module structure: `src/app.module.ts` wires `AppController` to `AppService`; `src/main.ts` bootstraps and listens. There's a single module today — new features should follow the same controller/service/module split as they're added.
- Jest config for unit tests lives inline in `package.json` (`rootDir: "src"`, matches `*.spec.ts`). E2E tests live under `test/` with their own config (`test/jest-e2e.json`) and boot a full Nest application (`test/app.e2e-spec.ts`) rather than testing a controller in isolation.
- ESLint runs `typescript-eslint`'s `recommendedTypeChecked` plus `eslint-plugin-prettier/recommended`, meaning Prettier violations surface as ESLint errors here (unlike the client app, which uses `eslint-config-prettier` instead). Prettier's actual rules come from the repo root (`../../.prettierrc.json`) — there is no per-app `.prettierrc`.

## Keeping this file current

If the module structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
