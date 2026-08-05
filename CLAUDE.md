# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a pnpm workspace orchestrated by Turborepo. Run from the repo root:

```bash
pnpm dev            # runs `dev` in both apps in parallel (client on :3000)
pnpm build          # runs `build` in both apps (turbo caches per-app outputs)
pnpm test           # runs `test` in both apps
pnpm lint           # runs `lint` in both apps
pnpm format         # prettier --write across the whole repo
pnpm format:check   # prettier --check across the whole repo
```

To target a single app instead of both, use pnpm's `--filter`, or `cd` into the app and run its script directly (see `apps/client/CLAUDE.md` and `apps/server/CLAUDE.md` for per-app commands, including how to run a single test):

```bash
pnpm --filter client dev
pnpm --filter server test
```

## Architecture

- **Package manager / task runner**: pnpm workspaces (`pnpm-workspace.yaml`: `apps/*`) + Turborepo (`turbo.json`). The two apps have no cross-package dependency on each other today — `turbo.json`'s `dependsOn: ["^build"]` is a no-op until that changes.
- **Apps**: `apps/client` (Next.js 16, App Router) and `apps/server` (NestJS 11). Each app is self-contained with its own `package.json`, linter, and test runner — see their respective `CLAUDE.md` for details.
- **Formatting**: a single root `.prettierrc.json` governs style for both apps. The two apps wire Prettier into ESLint differently (client uses `eslint-config-prettier` to silence conflicting stylistic rules; server uses `eslint-plugin-prettier/recommended` to run Prettier *as* an ESLint rule) — don't assume the two `eslint.config.mjs` files follow the same pattern.
- **pnpm build scripts**: native postinstall scripts for `esbuild` and `unrs-resolver` (pulled in by Vitest's toolchain) are explicitly allowlisted via `pnpm.onlyBuiltDependencies` in the root `package.json`. If a new dependency needs a postinstall script, pnpm will block it silently until it's added there (or approved via `pnpm approve-builds`).
- **Claude Code permissions**: `.claude/settings.local.json` pre-approves common init/install commands (`npm install`, `pnpm add`, `pnpm dlx create-next-app`, `pnpm dlx @nestjs/cli`, `nest new`, etc.) so scaffolding work doesn't need per-command confirmation.

## Keeping this file current

When you add, remove, or rename an app, package, or major architectural piece (new workspace, new shared package, a new build/test tool, a change to how the two apps relate), update this file and the affected per-app `CLAUDE.md` in the same change. Stale instructions are worse than none — don't let this drift from the actual structure.
