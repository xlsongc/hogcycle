# 36. The futures market is checked against itself

Date: 2026-10-21 · Status: Accepted

Extends [ADR-0035](0035-the-futures-market-is-a-tier-of-its-own.md). Built
on the owner's instruction to make the site useful past its original rules;
plan item 6 of the 10-20 next steps ("the futures curve's history").

## Context

The overview shows the futures curve: what the market prices each coming
delivery month at. On 2026-10-20 it rose from 9,750 元/吨 (LH2611) to
12,965 (LH2709), a priced recovery. A reader has no way to know how much
weight that deserves. The project will not forecast, and it will not call
the market right or wrong either. It can show how far the market's own
prices have been from where its contracts finished.

Sina serves every contract's whole life, listing to delivery, back to
LH2109, the first. ADR-0035's adapter kept only each contract's latest
settle.

## Decision

- **Every settle is a print.** The adapter now writes each trading day's
  settle as a release of its delivery month (`published_on` = the trading
  day). The curve as it stood on any past day comes from `published()`.
  A one-off backfill (`hogcycle collect --contracts-back 62`) read the 31
  delivered contracts. The six live ones came from bronze already held,
  through `replay`. Silver holds 7,771 settles of 37 contracts, 2021-01-08
  to 2026-10-20.
- **Sina's blank days are declared, not guessed.** The backfill failed
  validation on 12 settles of 0, on the same two days the main contract
  has them (2021-12-30, 2024-09-25), across every contract trading then.
  The curve now declares `zero_is_null` as the main contract does, and a
  blank day writes no print rather than a null that would supersede the
  day before.
- **The record is arithmetic on settles (`gold/market.py`).** For each
  delivered contract: the settle in force on the first day of the month 1,
  3, 6 and 9 months before its delivery month, against its last settle.
  Both are the market's own prices in one caliber (元/吨 of the delivery
  grade), so no spot price is converted or set beside it. A horizon before
  the contract listed is left out, not filled. Per horizon: how many
  contracts, the mean distance, the signed mean and the largest miss.
- **It travels as its own block, `market`**, beside the panels (contract
  1.7.0, an added optional field). Only the curve's own page and the
  overview read it, so the other pages do not carry 1,724 weekly settles.
  The chart draws each contract by the last settle of each week.
- **Found on the way, and fixed first:** silver made an older release
  current when it was learned after a newer one. The futures backfill would
  have shown each contract's previous settle as today's. See commit
  543ee2b and the fourth property in `tests/test_properties.py`.
- **Collected from GitHub now.** The `probe` workflow (a manual run that
  collects into the runner's checkout and keeps nothing) reached Sina from
  a runner for both series on 2026-10-21, so both move to `reach: anywhere`.

## What it shows (2026-10-21, 31 delivered contracts)

| before delivery | contracts | mean distance | signed mean | largest |
|---|---|---|---|---|
| 1 month | 31 | 11.0% | +3.2% | +48.6% (LH2301) |
| 3 months | 31 | 15.8% | +9.1% | +67.7% (LH2109) |
| 6 months | 31 | 24.6% | +18.4% | +119.4% (LH2109) |
| 9 months | 30 | 26.7% | +19.9% | +91.9% (LH2201) |

Six months out, 24 of 31 contracts were priced above where they finished.
The exceptions are the rises of mid-2022 and mid-2024, which the market
under-priced. Over this sample the curve has leaned towards a recovery that
came later or smaller than priced. That is a description of five years
mostly spent falling, not a law: the page says so, and nothing adjusts the
curve by it.

## Consequences

- The overview's futures section adds one line under the bars: the mean
  distance three and six months out, and the signed mean six months out.
- The curve's page gains the chart of every contract's life and the
  track-record table, with every contract's numbers behind a button.
  Standing on a past day, the chart stops there and the table is hidden,
  like the other computed facts (ADR-0025).
- The record updates itself: each contract that delivers joins it on the
  next export. Nothing is fitted, so there is nothing to refit.
- A reader will want the same check for the spot series we estimate
  (ADR-0034). That needs a vintage of the estimate, which does not exist
  yet. Not built.
