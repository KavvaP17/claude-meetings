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
- **Known issue**: rendering _any_ hook-using component (confirmed down to a bare `useState`) under the current Vitest 2.1.9 + React 19.2.8 + jsdom setup throws `Cannot read properties of null (reading 'useState')` from React's `resolveDispatcher()` — a pre-existing environment bug, not something a specific component does wrong (the same components render fine in the actual browser via `pnpm dev`). Clearing the Vite/Vitest cache and `resolve.dedupe: ['react', 'react-dom']` did not fix it; it likely needs a Vitest 3.x upgrade. Until fixed, hook-based components can't be unit-tested here — verify them manually in the browser instead, and see the skipped test in `src/app/page.test.tsx` for how to re-enable coverage once resolved.
- ESLint is `eslint-config-next` (core-web-vitals + typescript) plus `eslint-config-prettier` to disable rules that would conflict with Prettier. Prettier itself is configured at the repo root (`../../.prettierrc.json`), not per-app.
- UI components use HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`). `src/app/globals.css` imports `@heroui/styles` right after `tailwindcss` — order matters. No `HeroUIProvider` is needed in v3. Use the `heroui-react` skill (`.claude/skills/heroui-react` at the repo root) when adding components — its v3 API differs substantially from v2 (compound components like `Card.Header` instead of flat props) — see the skill before assuming v2 patterns apply.
- **Backend API**: `src/lib/api/client.ts` has the shared `apiFetch<T>()` helper (base URL from `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:3001` in dev — the server runs on :3001, not :3000, so it doesn't collide with this app's dev port; see `apps/server/CLAUDE.md`) and the typed `ApiError` (carries HTTP `status` + message extracted from Nest's error body). `src/lib/api/auth.ts` (`registerUser`, `loginUser`) and `src/lib/api/meetings.ts` (`getMeetings`, `createMeeting` — both take an `accessToken` and send it as `Authorization: Bearer`) build on top of it.
- **Session / auth guard**: `src/lib/auth/session.ts` stores `accessToken` + `email` in `localStorage` (`setSession`/`getSession`/`clearSession` — there's no cookie or server session, it's purely client-side). `src/lib/auth/useRequireSession.ts` is the guard hook for pages that require a logged-in user: it reads the session via `useSyncExternalStore` (not `useEffect`+`setState` — that trips the `react-hooks/set-state-in-effect` lint rule and, for `useSyncExternalStore` specifically, needs its `getSnapshot` to return a cached/stable reference or React throws an infinite-loop warning) and redirects to `/login` when there's none. Returns `{ session, logout }`; consumers should render `null`/a `Spinner` while `session` is falsy.
- **Registration / Login**: `src/app/register/page.tsx` and `src/app/login/page.tsx` — client components built with HeroUI's `Form`/`TextField`/`Card` composition, cross-linked to each other. Register mirrors the server's `RegisterDto` validation (email format, 8-char min password) client-side via `TextField`'s `validate` prop; login has no client-side password rule since the server just checks it against a hash. Both show server errors (register: 409 duplicate email; login: 401 invalid credentials; both: network failures) in a `role="alert"` banner, include a show/hide toggle on the password field, and on success call `setSession` and redirect to `/`.
- **Dashboard (`/`) and meeting creation (`/meetings/new`)**: both protected by `useRequireSession`. The dashboard greets the user by email, has a "Log out" button (`logout()` from the hook — no confirmation dialog; logout isn't a destructive/data-loss action), shows the total meeting count and the 3 most recent (`GET /meetings` has no `userId` scoping or ordering server-side — the Prisma `Meeting` model has no owner field, so this list is global across all users, sorted client-side by `date` descending), and a "Create meeting" button. A 401 from `getMeetings` (expired token) calls `logout()`. `/meetings/new` posts to `POST /meetings` (`title`, `date` as ISO 8601 via `Date.toISOString()`, `participants` parsed from a comma-separated field) and redirects back to `/` on success.

Whenever a new page needs to be usable only by a logged-in user, wrap it with `useRequireSession` rather than re-deriving the redirect logic.

## UI/UX review

Any change to this app's UI (new pages/components, edits to existing markup, styling, or interaction behavior) must be checked against the `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max` at the repo root) before the change is considered done. Invoke the skill and run its `scripts/search.py` against the relevant domains (`ux` for accessibility/touch/forms, `color`/`typography` for visual changes) to check the change against its rule database, and fix what it flags (or note explicitly why a flagged item doesn't apply) before wrapping up.

## In-progress feature: meeting file upload

While implementing @docs/plan-meeting-file-upload-and-display.md (Фазы 4-5, frontend), read @docs/research-meeting-file-upload-and-display.md first — it fixes the technical decisions (why `XMLHttpRequest` over `fetch` for upload progress, `uploadMeetingFile` shape, client/server validation constant duplication) so they aren't re-derived or re-litigated during implementation. Remove this section once the feature has shipped and its decisions are reflected in the rest of this file.

## Keeping this file current

If the route structure, testing setup, or lint/format tooling for this app changes, update this file (and the root `CLAUDE.md` if the change affects the workspace as a whole) in the same change.
