# 33. The browser computes only over what the reader chose

Date: 2026-10-20 · Status: Accepted

Narrows [ADR-0016](0016-pages-and-a-crosshair-synced-by-time.md)
(the page renders numbers rather than working them out). Decided as Q4 of
the [phase-2 plan](../specs/2026-10-14-phase-2-upgrade.md).

## Context

ADR-0016 keeps arithmetic out of the page. A streak, an extreme or a
percentile is computed once, in gold, tested, and carried in the contract,
so a number on the page has one source. The page draws what it is given.

Two of the plan's reading aids cannot work that way. Range statistics (A8)
describe a window, and cycle overlays (A9) re-base a series at a month.
Either input can be any of thousands of choices, and only the reader can
make it. Gold cannot precompute a window nobody has picked yet, and
shipping every possible window would multiply the contract for numbers
almost nobody asks for.

## Decision

- **The browser may compute facts over an input only the reader chooses.**
  Such an input is a window picked with a preset or a drag, or a cycle
  start typed as a month. Today these are `lib/windowStats.ts` and
  `lib/cycles.ts`.
- **Never where gold has an answer.** The default all-history view gets no
  browser-computed facts, because gold already prints its extreme and
  percentile above the chart. The window facts appear only once a reader
  has chosen a window, so one number never has two sources.
- **Each such number says where it came from:** "computed in your browser
  from the points shown".
- **Facts only.** That means first and last, change, high and low with
  their dates, and a rank among the readings in view. There is no rate, no
  fitted line, and no turning point found by the code. A cycle starts where
  the reader says. The page never proposes a start, because picking a
  trough is reading the cycle (CLAUDE.md, "gold computes, it does not
  judge").
- **No percentage, and no index, across zero.** A profit that turns into a
  loss has no base to be a share of. The window gives the change in units
  only, and the cycle overlay draws such a series in its own units.
- **The same functions are tested.** They have no imports but types, so
  `node --test` runs them as they stand, in CI.

## Consequences

- A chosen window and a set of cycle starts live in the URL (`w`/`from`/`to`,
  `cyc`/`ch`), so a comparison is a link, as on the wall and compare pages.
- Standing on a past day, the browser computes over the panel as it was
  knowable then (ADR-0025), because that is the only panel the page has.
- A new browser-side computation needs the same justification: an input
  only the reader can choose, and no answer from gold for it.
