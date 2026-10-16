# 29. What fails a run, what warns, and which sources must agree

Date: 2026-10-16 · Status: Accepted

Extends [ADR-0015](0015-acknowledged-outages-expire.md) and
[ADR-0018](0018-weekly-prices-from-the-ministry.md), whose agreement figures
this turns into checks.

## Context

Validation already rejects a batch whose unit drifts, whose values leave
`lo`/`hi`, or whose dates are impossible. Two kinds of wrongness pass it.

- **A broken store.** Silver's key is (indicator, obs_date, fetched_at,
  published_on). Two rows with the same key mean a write happened twice,
  and every as-of view built on it is then ambiguous. Nothing checked this
  after the write.
- **A source that drifts but stays plausible.** The 玄田 mirror mistyped one
  week (25.63 as 25.36), well inside any range check (ADR-0018). Each check
  that would have caught it compared one source against another, ran once,
  and lived in an ADR as a number.

Three pairs measure the same thing twice, and today they agree:

| pair | today |
|---|---|
| 仔猪价格 weekly, averaged by month, vs the joint release's monthly print | 56 of 56 months within 2% (worst 1.8%, 2022-12) |
| 发改委 猪粮比价 vs the 500-county ratio, same week | mean gap 0.256, sd 0.155, worst 0.63, r = 0.996 (231 weeks) |
| 统计局 year-end 能繁母猪 vs USDA's estimate of it | identical every year from 2023 |

## Decision

- **`hogcycle status` runs the quality checks.** `--json` adds one line per
  check with `kind: "quality"`, and a level of `error` or `warn`.
- **A duplicate bitemporal key is an `error`** and fails `--fail-on-stale`,
  like a stale series. It means the store itself is wrong, and replay
  depends on it not being.
- **A disagreement between sources is a `warn`.** It is printed every run
  and in the stale-series issue's status block, and it never fails the run.
  A disagreement says one of two sources moved. Which one is a question for
  a person, and failing the run would only teach people to stop reading it.
- **The thresholds come from the table above,** with room for an ordinary
  month, and live beside the checks in code:
  - the latest month of the 仔猪价格 pair differs by more than 2%;
  - the latest overlapping week of the ratio pair is more than 0.5 from the
    0.26 mean gap;
  - any year-end pair of sow stocks from 2023 on differs by more than 0.5%.

  Loosening one is a reviewed diff, as for staleness.
- **Not built: a volume check** against each indicator's trailing median.
  Rows per run are zero or one on most days for a weekly or monthly series,
  and backfills write hundreds by design, so no baseline separates a parser
  that doubled its output from a backfill. The uniqueness check catches the
  double write that matters.

## Consequences

- A source that shifts level, freezes on an old value or changes whom it
  asks now prints a warning the first run it shows, naming both sources and
  the gap. A single mistyped week does not: the mirror's 25.36 for 25.63
  moved its month's mean by about 0.3%. Catching that takes the week-by-week
  check ADR-0018 did by hand when switching sources, and that check stays a
  step in switching.
- When 猪粮比价 returns or is retired (ADR-0015, 2026-12-31), its pair either
  resumes or ends. A pair with no overlap reports that, and does not warn.
