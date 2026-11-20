# server/ insights

Append-only — written via the engineering-insights skill.

## What Works

## What Doesn't Work

- 2026-11-20 — Don't run `npx prettier --write` on server files: there is no prettier config, so it rewrites every quote to double and reindents the file; edit by hand in the existing single-quote style (`src/db/schema/runs.ts`)

## Codebase Patterns

- 2026-11-20 — A run's persisted log is snapshotted when the trace object is built (`log: runLog.logFor(runId)`); anything logged after that, incl. `Run complete; trace persisted`, only reaches live SSE, not the trace — emit lines meant for the log tab before building the trace (`src/modules/reviews/run-executor.ts:287`)

## Tool & Library Notes

- 2026-11-20 — Drizzle `sum()` returns `string | null` (Postgres numeric), not a number — convert with `Number()` before putting it in a `z.number()` contract, and assert `typeof === 'number'` in the it-test (`src/modules/pulls/routes.ts:140`)

## Recurring Errors & Fixes

- 2026-11-20 — `*.it.test.ts` fail with "Could not find a working container runtime strategy" on colima (no `/var/run/docker.sock`) → run with `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` (`test/helpers/pg.ts:36`)

## Session Notes

## Open Questions
