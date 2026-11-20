# client/ — @devdigest/web

Stack, UI route map, API base → read `README.md` when you need them.

## Commands (pnpm)
dev (:3000) · build · typecheck · test (vitest + jsdom, fetch mocked — no API needed)

## Layout
src/app/**/page.tsx thin routes · `_components/<Name>/` colocated feature UI ·
src/components shared chrome (app-shell, diff-viewer) · src/lib/api.ts the only
fetch layer · src/lib/hooks TanStack Query hooks · src/vendor/ui `@devdigest/ui` ·
src/vendor/shared contracts · messages/en/*.json i18n strings

## Conventions
- Pages stay thin; feature logic lives in `_components/<Name>/` with its own `*.test.tsx`.
- Data access only through hooks in `src/lib/hooks` → `src/lib/api.ts`; no raw
  `fetch` in components.
- UI primitives come from `@devdigest/ui`; add missing ones there, not ad hoc.
- User-facing strings go through `next-intl` (`useTranslations`) with keys in
  `messages/en/<namespace>.json`.
- API types come from `@devdigest/shared`, not hand-written interfaces.

## Do not touch
- `src/vendor/shared` — a copy of `server/src/vendor/shared`; change it there and
  copy over (see root CLAUDE.md).

## Read when
- Adding a route or page → read `README.md` (route map)
- Using or extending UI primitives → read `src/vendor/ui/README.md`
- Designing a feature → check `specs/`; deep dives → `docs/`
- Before starting work here → read `INSIGHTS.md`
- Real browser journeys → `../e2e/CLAUDE.md`
