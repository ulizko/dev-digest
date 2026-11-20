# server/ insights

Append-only — written via the engineering-insights skill.

## What Works

## What Doesn't Work

- 2026-11-20 — Don't run `npx prettier --write` on server files: there is no prettier config, so it rewrites every quote to double and reindents the file; edit by hand in the existing single-quote style (`src/db/schema/runs.ts`)

## Codebase Patterns

- 2026-11-20 — A run's persisted log is snapshotted when the trace object is built (`log: runLog.logFor(runId)`); anything logged after that, incl. `Run complete; trace persisted`, only reaches live SSE, not the trace — emit lines meant for the log tab before building the trace (`src/modules/reviews/run-executor.ts:287`)

## Tool & Library Notes

- 2026-11-20 — Drizzle `sum()` returns `string | null` (Postgres numeric), not a number — convert with `Number()` before putting it in a `z.number()` contract, and assert `typeof === 'number'` in the it-test (`src/modules/pulls/routes.ts:140`)

- 2026-11-20 — Run cost for OpenRouter comes from the API's `usage.cost` (verified equal to the OpenRouter Activity dashboard); `PriceBook` → static `pricing.ts` is only a fallback when a response lacks `usage.cost`, and the PriceBook cache is not warmed on boot, so the stale static table (`deepseek-v4-flash` $0.14/$0.28 vs live $0.09/$0.18 per 1M) can leak into a cost on the first such call — refresh the table if fallback numbers look off (`src/adapters/llm/pricing.ts:31`, `reviewer-core/src/llm/openrouter.ts:107`)

## Recurring Errors & Fixes

- 2026-11-20 — `*.it.test.ts` fail with "Could not find a working container runtime strategy" on colima (no `/var/run/docker.sock`) → run with `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` (`test/helpers/pg.ts:36`)

## Session Notes

### 2026-11-20
- M1 Run Cost Badge shipped (`specs/M1-run-cost.md`): per-run `agent_runs.cost_usd`, per-PR SUM in the PR list; verified against the OpenRouter dashboard on one real run.

## Open Questions
