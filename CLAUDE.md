# DevDigest

Local-first AI PR review. Four standalone packages — NOT a workspace: each has
its own package.json + lockfile. Run every command inside the package dir.

| Dir | Package | Stack | Port | PM |
|---|---|---|---|---|
| server/ | @devdigest/api | Fastify 5 · Drizzle · Postgres+pgvector | 3001 | pnpm |
| client/ | @devdigest/web | Next.js 15 · React 19 · TanStack Query · next-intl | 3000 | pnpm |
| reviewer-core/ | @devdigest/reviewer-core | pure TS engine, consumed as source via tsconfig alias | — | npm |
| e2e/ | @devdigest/e2e | agent-browser JSON flows, no LLM | — | npm |

Each package has its own CLAUDE.md with its conventions — they are not repeated here.

## Commands
- Full stack: `./scripts/dev.sh` (`--no-seed` · `--no-client` · `--db-only`)
- Per package: see that package's CLAUDE.md

## Per-package docs layout
- `README.md` — entry point and source of truth (stack, API/route map, env).
- `docs/` — deep dives: architecture, data flows.
- `specs/` — feature designs before implementation, `M<n>-<slug>.md` with a
  `Status: draft | accepted | done` line. In e2e they live in `e2e/docs/specs/`
  (`e2e/specs/` holds test flows).
- `INSIGHTS.md` — per-package learnings in 7 fixed sections; written via the
  `engineering-insights` skill (append-only). Add an entry whenever something
  cost a retry.

## Session protocol
- Start: right after the user's prompt, before answering or editing, identify
  the package(s) the request is about and read their `INSIGHTS.md`. Treat it
  as high-confidence guidance unless told otherwise. Do not skip this step.
- End: run `/engineering-insights` at the end of every session. It writes only
  substantive insights not already in the file; nothing new → nothing written.

## Read when
- Changing the review flow across packages → read `docs/architecture/review-workflow.md`
- Editing built-in agent prompts → read `docs/agent-prompts/README.md`
- Adding tests or touching CI workflows → read `TESTING.md`
- Starting a milestone feature → check that package's specs first

## Cross-package rules
- Shared Zod contracts: `server/src/vendor/shared` is canonical (reviewer-core
  imports it too); `client/src/vendor/shared` is a byte-identical copy. Edit the
  server copy, then `cp -R server/src/vendor/shared/. client/src/vendor/shared/`;
  `diff -r` of the two must stay empty.
- reviewer-core never emits JS; server imports its source via the path alias.

## Do not touch
- `docker compose down -v` — wipes the dev DB volume with all imported repos.
- `.omc/` — local tool state.
