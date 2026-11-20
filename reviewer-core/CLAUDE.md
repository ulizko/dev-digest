# reviewer-core/ — @devdigest/reviewer-core

Pipeline, public API, prompt slots → read `README.md` when you need them.

## Commands (npm)
test (vitest, stubbed `LLMProvider`, no keys/network) · typecheck (= build, emits no JS)

## Layout
src/prompt.ts prompt assembly + `INJECTION_GUARD` · src/grounding.ts citation gate ·
src/llm structured output + OpenRouter provider · src/review run + reduce ·
src/output CI payload · src/index.ts public API · test/ all tests

## Conventions
- Pure engine: no DB, no HTTP server, no imports from `server/src` except the
  shared contracts alias. The LLM provider is always injected.
- `@devdigest/shared` resolves to `../server/src/vendor/shared` (tsconfig paths).
- Anything new the server needs must be exported from `src/index.ts`.
- Optional prompt slots (skills, memory, specs, callers) are omitted, not empty —
  `assemblePrompt` drops absent sections.

## Do not touch
- Grounding gate: findings without a real diff line are dropped, and the score is
  recomputed from survivors. Never trust the model's score or skip the gate.
- `INJECTION_GUARD`: one trusted rule appended to every system prompt. Do not
  replace it with keyword scanning of untrusted text.

## Read when
- Changing prompt structure or the run flow → read `README.md` and
  `../docs/architecture/review-workflow.md`
- Designing a feature → check `specs/`; deep dives → `docs/`
- Before starting work here → read `INSIGHTS.md`
