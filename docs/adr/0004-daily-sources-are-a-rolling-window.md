# 4. Daily sources are a 1-year rolling window

Date: 2026-09-05 · Status: Accepted

## Context

Verified against live akshare 1.18.94 on 2026-09-05. Two daily series —
`futures_hog_core(外三元)` and `futures_hog_cost(玉米)` — each returned exactly
367 rows, both starting exactly one year before the query date.

    外三元    367 rows   2025-09-05 → 2026-09-05
    玉米      367 rows   2025-09-05 → 2026-09-05

Weekly and monthly series are not windowed the same way: 行情宝 gives 11.7
years, 白条肉 8.5, 猪粮比价 6, 肉类价格指数 8.7. The 搜猪 (`spot_*_soozhu`)
family is worse than either — 15 rows, a two-week snapshot, not an archive.

## Decision

Accept the limit rather than fight it. Historical positioning rests on the
weekly and monthly series; daily series answer "what is happening now" and are
accumulated forward from today.

## Consequences

- **The daily collection run has a second purpose that has nothing to do with
  revisions: it preserves data before upstream deletes it.** Skip a year and
  that year of daily history is gone for good, from every free source.
- This makes the collector's uptime, not its cleverness, the thing to protect.
- Two kinds of "history" must not be conflated. *Time-series depth* (how far
  back values go) can be backfilled for weekly/monthly series at any time.
  *Belief history* (what we thought on a past date) can only accumulate
  forward. The inherited codebase built the second and had almost none of the
  first — the reverse of what phase 1 needs.
- Sub-daily granularity backtests are impossible for the first year. Accepted.
