# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # next dev
pnpm build        # next build
pnpm start        # next start (serves the production build)
pnpm lint         # eslint
pnpm test         # vitest run
pnpm test:watch   # vitest (watch mode)
```

Run a single test file or test name:

```bash
pnpm vitest run src/app/page.test.tsx
pnpm vitest run -t "renders the get started heading"
```

## Architecture

- Next.js 16, App Router, TypeScript, Tailwind CSS v4 (via `@tailwindcss/postcss`). Path alias `@/*` resolves to `./src/*`.
- Tests are colocated next to the code they cover (`src/app/page.test.tsx`) and run under Vitest with jsdom (`vitest.config.ts`, `vitest.setup.ts` loads `@testing-library/jest-dom` matchers).
- ESLint is `eslint-config-next` (core-web-vitals + typescript) plus `eslint-config-prettier` to disable rules that would conflict with Prettier. Prettier itself is configured at the repo root (`../../.prettierrc.json`), not per-app.
- The `heroui-react` skill (`.agents/skills/heroui-react` at the repo root) documents HeroUI v3 — use it when adding UI components from `@heroui/react`. Its v3 API differs substantially from v2 (no `HeroUIProvider`, compound components like `Card.Header` instead of flat props) — see the skill before assuming v2 patterns apply.

## Keeping this file current

If the route structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
