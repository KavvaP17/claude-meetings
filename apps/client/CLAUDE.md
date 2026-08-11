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
- UI components use HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`). `src/app/globals.css` imports `@heroui/styles` right after `tailwindcss` — order matters. No `HeroUIProvider` is needed in v3. Use the `heroui-react` skill (`.claude/skills/heroui-react` at the repo root) when adding components — its v3 API differs substantially from v2 (compound components like `Card.Header` instead of flat props) — see the skill before assuming v2 patterns apply.
- **Backend API**: `src/lib/api/auth.ts` wraps `apps/server`'s auth endpoints (`registerUser` → `POST /auth/register`) behind a typed `ApiError` (carries the HTTP `status`, message extracted from Nest's error body). Base URL comes from `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:3001` in dev — the server runs on :3001 (not :3000) specifically so it doesn't collide with this app's dev port; see `apps/server/CLAUDE.md`.
- **Registration**: `src/app/register/page.tsx` — client component built with HeroUI's `Form`/`TextField`/`Card` composition. Mirrors the server's `RegisterDto` validation (email format, 8-char min password) client-side via `TextField`'s `validate` prop so users get instant feedback before hitting the API; server-side errors (409 duplicate email, network failures) surface in a `role="alert"` banner. On success the JWT `accessToken` is stored in `localStorage` and the user is redirected to `/`. There's no auth context/global session state yet — add one if more pages need to read the logged-in user.

## UI/UX review

Any change to this app's UI (new pages/components, edits to existing markup, styling, or interaction behavior) must be checked against the `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max` at the repo root) before the change is considered done. Invoke the skill and run its `scripts/search.py` against the relevant domains (`ux` for accessibility/touch/forms, `color`/`typography` for visual changes) to check the change against its rule database, and fix what it flags (or note explicitly why a flagged item doesn't apply) before wrapping up.

## Keeping this file current

If the route structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
