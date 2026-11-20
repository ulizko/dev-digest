# server/ — @devdigest/api

Stack, API map, env vars, DI flow → read `README.md` when you need them.

## Commands (pnpm)
dev · typecheck · db:migrate · db:generate · db:seed
- unit: `pnpm exec vitest run --exclude '**/*.it.test.ts'`
- integration (needs Docker): `pnpm exec vitest run .it.test`

## Layout
src/modules/<name>/ feature plugins · src/adapters ports + mocks.ts ·
src/platform config, DI container, errors · src/db schema + migrations ·
src/vendor/shared contracts · test/ all tests (not colocated)

## Conventions
- New module = `modules/<name>/routes.ts` default plugin + one import/entry in
  `modules/index.ts` (static registry, no autoload).
- Validate via route zod schemas (fastify-type-provider-zod); never
  `Schema.parse(req.body)` in handlers.
- External calls only through DI adapters; tests use `src/adapters/mocks.ts`.
- Secrets only via `SecretsProvider` — never in `AppConfig`, DB, or git.
- `*.it.test.ts` = DB-backed (testcontainers); every other test stays hermetic.

## Gotchas
- Migrations are NOT applied on boot — run `pnpm db:migrate`.
- The schema already has every milestone's table — check before adding one.
- An unindexed repo silently degrades the review to diff-only.

## Do not touch
- Already-applied files in `src/db/migrations/` — change `schema` and run
  `pnpm db:generate` instead.

## Read when
- Touching repo-intel → read `src/modules/repo-intel/README.md`
- Designing a feature → check `specs/`; deep dives → `docs/`
- Before starting work here → read `INSIGHTS.md`
