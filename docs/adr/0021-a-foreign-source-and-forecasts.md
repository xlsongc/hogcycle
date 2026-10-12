# 21. USDA's estimates of China come in, and a forecast is a kind of indicator

Date: 2026-10-12 · Status: Accepted

## Context

Every source so far is Chinese, and none publishes a forecast or revises
itself on a schedule. ADR-0017 found that the restatements the store was
built for do not happen in the domestic primary sources. USDA FAS's PSD
database publishes China's sow herd and pork output and revises them every
April and October. It also publishes next year's forecast.

The bulk file is one zip for every country. Each row records the market
year and the month USDA last set it. Its past sow figures match 统计局's
year-end figure from the end of 2023 (41,420 / 40,780 / 39,610 thousand
against 4,142 / 4,078 / 3,961 万头). For 2021 and 2022 they differ, at
42,000 and 43,000 thousand against 统计局's 4,329 and 4,390 万头, so it is
a second account, not a copy. The newest row is USDA's forecast for the end
of 2026: 37,300 thousand.

Two rules stood in the way. `Observation` rejected any obs_date in the
future, and any release dated before its period ended. Both rules are right
for a measurement and wrong for a forecast.

## Decision

- **`usda_psd` adapter.** It keeps China's swine rows from the bulk file,
  as rows. A beginning stock is the 31 December before its market year,
  the same instant as 统计局's year-end figure. A flow ends on 31 December.
  Values stay in USDA's units (thousand head, thousand tonnes CWE). Rows set
  in the file's Last-Modified month get that day as `published_on`. Older
  rows give only a month, so their day is NULL, not guessed. Two series:
  `usda_sow_stocks` and `usda_pork_production`.
- **`forecast: true` on a spec.** The future and early-release checks move
  from `Observation` into batch validation, and a declared forecast is
  exempt. A forecast is kept off the wall, out of the window's end (which
  it would push into next year) and has no release-lag summary (its "lag" is
  negative and means nothing to a backtest). Status reports it as
  "forecast to <date>".
- **The capacity card quotes USDA's forecast as USDA's** ("USDA 预测 2026
  年末：37,300 千头"), linked to its page, when it reaches past the latest
  measurement. The project still makes no forecast of its own.
- **The machine running this one** cannot resolve `apps.fas.usda.gov`
  through its own DNS (it does through a public resolver). The first rows
  were loaded from a file downloaded that way and passed through
  `collect_one`, so bronze holds the real payload. From then on the daily
  run on GitHub's runners fetches it directly.

## Consequences

- From the next April release on, silver will hold real revisions,
  USDA's own, which is what the store was built for. The revision trail on
  the series page will show them without new code.
- Units differ from the domestic sow series (thousand against 万头). That
  is deliberate: the two are different sources' numbers, and the series page
  says so.
