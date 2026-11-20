# M1 — Run Cost Badge

Status: draft

Крос-пакетна фіча (server + client). Spec лежить у `server/`, бо сервер володіє
даними й канонічними Zod-контрактами.

## Навіщо

Завдання 3 курсу («Run Cost Badge»): бачити, скільки коштує кожен прогін
рев'ю-агента, і скільки сумарно коштував PR. Це перша особиста метрика курсу —
до цих цифр повернемось на L08, тому вони мають бути правдивими.

## Цілі

1. **Список PR** (`/repos/:repoId/pulls`) — колонка **COST** між STATUS і
   UPDATED: сума вартості всіх прогонів PR, компактно (`$0.014`).
2. **Таймлайн прогонів** на PR Detail (вкладка Agent runs, `RunHistory`) — під
   часом запуску рядок `9,119 tok · $0.0013` для кожного завершеного прогону.
3. **Drawer «Agent run»** (`RunTraceDrawer` → `TraceBody`, секція Stats) —
   плитка **COST** між TOKENS і FINDINGS: вартість цього прогону.

## Критерії приймання

- Цифра вартості прогону збігається з логом прогону (рядок `cost …` у
  trace-лозі) і з OpenRouter dashboard: вартість прогону = сума **всіх**
  generations цього прогону (map-виклики + повтори парсингу), звірити вручну
  на одному прогоні.
- Формат читабельний: щонайменше 2 значущі цифри і щонайменше 3 знаки після
  коми — `$0.0013`, `$0.014`, `$0.060`, ніколи `$0.01`/`$0.00`.
- Прогін без даних (running / failed / cancelled / старий прогін до фічі /
  невідома ціна моделі) показує `—`, ніколи `$0.00`.
- PR без жодного прогону з відомою ціною показує `—` у колонці COST.
- Нуль додаткових викликів моделі: ціна береться з відповіді, яка вже є.

## Не-цілі

- Тултіп із розбивкою по прогонах у списку PR (обговорено, відкинуто).
- Дорахування вартості для старих прогонів: поточний прайс ≠ тодішній, цифра не
  зійдеться з OpenRouter. Старі прогони показують `—`.
- Сортування/фільтр списку PR за вартістю.
- Рядок у плашці вердикту (Overview) зі слайда курсу — не входить у три екрани.
- CI-прогони (`ci_runs.cost_usd`) — окрема таблиця без зв'язку з PR; сума
  рахує лише локальні прогони з `agent_runs`.
- Вартість failed/cancelled прогонів, що встигли витратити токени до падіння —
  `reviewer-core` не повертає часткову ціну при exception; показуємо `—`
  (вимога курсу: незавершений прогін без фейкової ціни).
- Незмінний облік витрат: видалений з таймлайну прогін зникає і з суми PR.

## Як працює зараз

- `reviewer-core/src/llm/openrouter.ts` для OpenRouter просить `usage.include`
  і бере **реальну** ціну з `usage.cost`; для інших провайдерів
  (`server/src/adapters/llm/openai.ts`, `anthropic.ts`) — оцінка
  `estimateCost` (`PriceBook` → статична таблиця `pricing.ts`). Невідома
  модель → `null`.
- `reviewer-core/src/review/run.ts` сумує `costUsd` по викликах прогону; якщо
  хоч один виклик `null` → весь прогін `null`.
- `server/src/modules/reviews/run-executor.ts` отримує `outcome.costUsd` і
  **викидає** його. Комітом `d45ab0d` колонку `agent_runs.cost_usd`, поля
  `cost_usd` у `RunStats`/`RunSummary`, плитку COST і `formatCost` видалили.
  Ця фіча здебільшого повертає видалене + додає агрегат для списку.

## Дизайн

### Дані

- `agent_runs.cost_usd double precision NULL` — нова міграція `0010`
  (через `pnpm db:generate` після зміни `schema/runs.ts`). NULL = немає даних.
  У тій самій міграції — індекс `agent_runs_pr_id_idx` на `agent_runs(pr_id)`:
  агрегат списку PR фільтрує по `pr_id`, без індексу це seq scan усієї таблиці.
- Інваріант: `cost_usd` пишеться лише в `completeAgentRun` для `status='done'`;
  failed/cancelled-шляхи пишуть `null`.
- `run_traces.trace.stats.cost_usd` — у jsonb, міграція не потрібна.

### Сервер

- `run-executor.ts`: передати `outcome.costUsd` у `completeAgentRun` і в
  `trace.stats.cost_usd`; failed/cancelled/early-fail шляхи → `null`.
  Перед `Run complete; trace persisted` — рядок логу
  `cost $<usd|n/a> · tokens <in>→<out>`, щоб цифру можна було звірити з логом.
- `repository/run.repo.ts` + `repository.ts`: `costUsd` у сигнатурі
  `completeAgentRun`; `cost_usd` у мапінгу `listRunsForPull`.
- `pulls/routes.ts` (`GET /repos/:id/pulls`): поруч із `latestReviewByPr`
  один запит на всю сторінку, без N+1:
  `SELECT pr_id, SUM(cost_usd) FROM agent_runs WHERE pr_id IN (...) GROUP BY pr_id`.
  `SUM` ігнорує NULL; PR без відомих цін → NULL. Drizzle повертає `sum()` як
  string — привести до `number`.

### Контракти (`server/src/vendor/shared/contracts`, потім копія в client)

- `trace.ts` → `RunStats.cost_usd: z.number().nullish()` (nullish, бо трейси
  до фічі поля не мають; роут віддає jsonb як є).
- `trace.ts` → `RunSummary.cost_usd: z.number().nullable()`.
- `platform.ts` → `PrMeta.cost_usd: z.number().nullish()` (як `score`: лише
  list-ендпоінт).
- Після правки: `cp -R server/src/vendor/shared/. client/src/vendor/shared/`,
  `diff -r` порожній.

### Клієнт

- `client/src/lib/format-cost.ts` — один `formatCost(usd)` на всі три місця:
  - `null`/`undefined` → `—`
  - `0` → `$0` (безкоштовна модель — це реальна ціна, не «немає даних»)
  - інакше `$` + `usd.toFixed(max(3, 1 - floor(log10(usd))))`
    → `0.0013 → $0.0013`, `0.014 → $0.014`, `0.06 → $0.060`, `1.5 → $1.500`.
- ① `PRRow` + `constants.ts` (`GRID`, `COLUMN_KEYS`) + i18n
  `prReview.list.columns.cost = "Cost"`; клітинка моноширинна.
- ② `RunHistory`: у правій колонці під часом, лише для `status='done'`:
  `{(tokens_in + tokens_out).toLocaleString()} tok · {formatCost(cost_usd)}`.
  Якщо `tokens_in` або `tokens_out` = null — сегмент `tok` не показуємо (не
  вигадуємо `0 tok`), лишається лише ціна.
- ③ `TraceBody`: `<Stat label={t("trace.stat.cost")} val={formatCost(stats.cost_usd)} />`
  між TOKENS і FINDINGS; i18n `runs.trace.stat.cost = "COST"`.

## Підходи (розглянуті)

- **A — сума всіх прогонів PR, рахує сервер** (обрано). Перезапуски теж
  коштують грошей; один SQL-агрегат.
- B — лише останній раунд рев'ю (як SCORE). Ховає витрати на повтори.
- C — сума + тултіп із розбивкою по прогонах. Відкинуто користувачем.

## Відомі межі

- Якщо в PR один прогін з відомою ціною і один з невідомою моделлю (не
  OpenRouter, нема в `pricing.ts`) — сума буде заниженою. OpenRouter завжди
  повертає `usage.cost`, тож для основного шляху це не стосується.
- Для не-OpenRouter провайдерів ціна — оцінка за прайсом, не рахунок. Для
  OpenRouter, якщо відповідь раптом без `usage.cost`, теж підставляється оцінка.
- Якщо після успішного LLM-виклику впаде збереження трейсу, catch перезапише
  прогін як failed з `cost_usd = null` (наявна поведінка executor'а, не чіпаємо).
- `sessionId` у OpenRouter спільний для перезапусків того самого PR+агента —
  при звірці з dashboard орієнтуватись на час generations, а не на сесію.

## Тести

- server: `contracts.test.ts` — `RunSummary`/`PrMeta` з `cost_usd`;
  `reviews.it.test.ts` — completed-прогін зберігає `cost_usd`, failed → null;
  список PR повертає суму / null.
- client: `formatCost` (null, 0, 0.0013, 0.014, 0.06); `RunHistory.test.tsx`
  — рядок `tok · $…` для done і відсутній для failed; `RunTraceDrawer.test.tsx`
  — плитка COST і `—` для трейсу без `cost_usd`.

## Рішення, прийняті мною (перевірте)

- Spec в `server/specs/`, не дублюю в `client/specs/`.
- `formatCost` у `client/src/lib/`, бо його використовують два різні роути.
- `0` → `$0`, а не `—`.
- Колонка COST стоїть між STATUS і UPDATED, як на дизайні; кнопку «Run Review»
  з мокапу в рядку не додаємо — її зараз у списку немає.
