# 1. Bitemporal storage: history is never overwritten

Date: 2026-09-05 · Status: Accepted

## Context

能繁母猪存栏 is the only genuine leading indicator in the hog cycle: a sow bred
today produces pork in 10-12 months, and that lag is fixed by biology, not by
statistics. It is *also* the only series upstream restates after the fact —
non-quarter-end months are extrapolated from 农业农村部 定点监测 month-on-month
rates and later replaced, and 国家统计局 revises its own figures.

Those two properties holding simultaneously is the whole problem. A store that
keeps only the latest value silently absorbs revisions, so this question
becomes unanswerable:

> Would a capacity-based signal have called the turn before the price moved,
> using only what was knowable at the time?

Any backtest run against such a table cheats, and cheats invisibly.

## Decision

Keep two independent time axes on every observation and never update in place:

    obs_date    valid time        the date the value describes
    fetched_at  transaction time  the moment we learned it

A revision is a new row beside the old one. `as_of(moment)` reconstructs the
state of knowledge at any past instant.

## Consequences

- Backtests become falsifiable. This is the project's reason to exist.
- The revision record can only accumulate **forward**. We cannot reconstruct
  what anyone believed in 2023; the archive starts the day collection starts.
- Storage grows only when a value actually moves (`append_changes`), so a
  stable series costs nothing per day.
- Anything that would overwrite silver — a dbt snapshot materialisation, a
  database UPSERT, a "rebuild from scratch" job — is off the table. See 0009.
