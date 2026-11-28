---
name: engineering-insights
description: Captures non-obvious engineering learnings into the INSIGHTS.md of the package the work touched (server/, client/, reviewer-core/, e2e/). Use proactively mid-session the moment something non-obvious is confirmed — a fix that needed more than one attempt, a dead end, a library/tool quirk, an undocumented convention, a decision with a reason, an open question — and at the end of every session (writes nothing when nothing new and substantive was learned). Also use on "wrap up", "capture insights", "what did we learn", or /engineering-insights.
---

# Engineering Insights

Two triggers: **as you go** (right after a non-obvious thing is confirmed, not guessed) and **wrap-up** (end of every session). Writing is conditional: only substantive insights that are not already in the file. Nothing new → write nothing and tell the user "no new insights".

## Where
Path of the files the insight is about → that package's `INSIGHTS.md`:
`server/**` (incl. `src/modules/repo-intel`, `src/vendor/shared`) → `server/INSIGHTS.md` ·
`client/**` → `client/INSIGHTS.md` · `reviewer-core/**` → `reviewer-core/INSIGHTS.md` · `e2e/**` → `e2e/INSIGHTS.md`.
Spans packages → write to each affected one. Repo-wide (scripts/, CI, docker) → propose it for root `CLAUDE.md`, don't write.

## Rubric → section
| Section | Write when |
|---|---|
| What Works | an approach that solved it, and why |
| What Doesn't Work | a dead end / antipattern you tried — most skipped, most valuable |
| Codebase Patterns | an undocumented convention or architectural decision + its reason |
| Tool & Library Notes | a dependency/tool quirk (version-specific behavior, limits) |
| Recurring Errors & Fixes | an error message → its fix |
| Session Notes | wrap-up, only if this session added entries above: 1–3 bullets under `### YYYY-MM-DD` |
| Open Questions | unresolved, worth checking next time |

## Quality gate — all three or don't write
1. Not obvious to anyone reading the code or the package's CLAUDE.md/README.
2. Would change what the next session does (saves ≥5 min).
3. Specific: names the thing, the condition, what to do, with evidence `path:line`.

❌ "Promises can be tricky" · ❌ "careful with async"
✅ "`Promise.all()` in the ingest pipeline times out past 30 items — use `Promise.allSettled()` in batches of 10 (`src/ingest/run.ts:42`)"

## Format
`- YYYY-MM-DD — <insight: what + why + what to do> (`path:line`)` — one line, imperative.

## Rules
- Re-read the target `INSIGHTS.md` right before writing, even if read earlier. If the insight is already there (same fact, any wording), don't write it.
- To correct an old entry, append a new one: `Supersedes YYYY-MM-DD "<old gist>": …`, and tell the user about the conflict.
- After writing, list each added entry to the user in one line — the file is a draft under human review.
- File past ~200 entries → tell the user it needs pruning or splitting; don't do it yourself.

## Writing safely — add lines, never lose any
- Never use Write on an existing `INSIGHTS.md`, never change, move or delete an existing line (headings included).
- Insert each entry as a new line directly above the next `## ` heading (Edit: `old_string` = that heading line, `new_string` = entry + blank line + heading). Last section (Open Questions) → append to the end of the file with `>>`.
- Guard every write with a snapshot (`<pkg>` = server, client, reviewer-core or e2e):
  - before: `cp <pkg>/INSIGHTS.md "${TMPDIR:-/tmp}/<pkg>-insights.before"`
  - after: `diff "${TMPDIR:-/tmp}/<pkg>-insights.before" <pkg>/INSIGHTS.md | grep '^<'` must print nothing.
  - prints anything → a line was lost: copy the snapshot back, re-add only the new entries, re-check, and tell the user.
