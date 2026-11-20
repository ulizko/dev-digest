# e2e/ — @devdigest/e2e

Flow format, env knobs, coverage table → read `README.md` when you need them.

## Commands (npm)
- Hermetic (preferred): `npm run e2e:hermetic` → `../scripts/e2e.sh`, an isolated
  freshly-seeded stack (Postgres :5433, API :3101, web :3100)
- Against a running stack: `npm test` · typecheck
- One-time: `npm i -g agent-browser && agent-browser install`

## Layout
specs/NN-name.flow.json test flows · run.ts runner · lib/ helpers ·
docs/specs/ feature design specs (NOT `specs/`, which holds flows)

## Conventions
- A flow is a JSON list of agent-browser commands; `wait --text` / `wait --url`
  are the assertions.
- Deterministic locators only (`--url`, `--text`, `find role|text|label`); never
  the AI `chat` command.
- Flows read seeded data only (`acme/payments-api`, PR #482, built-in agents);
  nothing may trigger a model call.

## Gotchas
- `npm test` against your dev DB fails flows 02/04/05 when it holds other repos —
  use the hermetic runner.
- Dev Postgres in `docker-compose.yml` is published on :5433, the hermetic
  default too — with the dev stack up, run `E2E_PG_PORT=5440 npm run e2e:hermetic`.

## Read when
- Writing or changing a flow → read `README.md`
- Changing the hermetic stack → read `../scripts/e2e.sh`
- Designing a feature → check `docs/specs/`; deep dives → `docs/`
- Before starting work here → read `INSIGHTS.md`
