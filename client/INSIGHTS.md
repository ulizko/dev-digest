# client/ insights

Append-only — written via the engineering-insights skill.

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

- 2026-11-22 — `Module not found: Can't resolve './contracts/findings.js'` (from `src/vendor/shared/index.ts`) in the Next dev build means a component imports a runtime VALUE from `@devdigest/shared` (e.g. `Severity.options`); tsc and vitest still pass because vite resolves `.js`→`.ts`, webpack does not. Use only `import type` from `@devdigest/shared` and mirror values locally, then check the page in the running app (`src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/constants.ts:4`, precedent `src/lib/feature-models.ts:5`)

## Session Notes

### 2026-11-22
- M2 severity counters: run filter in `FindingsPanel`, FINDINGS column + `FindingsPopover` in the PR list, `SeverityCount` in `@devdigest/ui`; the shared runtime-import build break was caught only in the running app.

## Open Questions
