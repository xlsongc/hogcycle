# 34. An estimate says it is one: profit and breakeven per hog

Date: 2026-10-20 · Status: Accepted

Bends [ADR-0019](0019-the-overview-answers-one-question.md) ("nothing on a
card is invented") and the CLAUDE.md rule "gold computes, it does not judge",
on the owner's instruction to make the site useful past its original rules.
Follows [ADR-0027](0027-new-series-from-a-release-already-collected.md) in
form: a derived series, rebuilt from silver.

## Context

The joint release printed 规模养殖每头成本 and 每头净利润 every month from
2021-12 and stopped with its 202508 edition. Losses are what make farms cull
sows, and culling is what turns the cycle. So since September 2025 the
margin tier has not been able to say whether farms are making or losing
money. That is the question a reader of a hog-cycle site asks first.

The prices behind those numbers are still printed every week, in the
ministry's 500-county report: hog, fattening feed and piglet. Iowa State's
*Estimated Livestock Returns* has shown for decades that a stated model on
such prices is useful, provided it says what it is.

## Decision

- **Gold estimates two weekly series, `profit_per_head_est` and
  `breakeven_price_est`.**
  - cost = a + b·feed + c·piglet, with both prices 13 weeks before the
    week, the time between buying them and selling the hog;
  - profit = w·hog − cost, and breakeven = cost ÷ w;
  - a, b and c come from least squares on every month where the official
    cost and profit and the three prices are known; w is the mean ratio of
    the official revenue (cost + profit) to the 500-county price.
- **The model was tested out of sample before it was built.** It was fitted
  on the first 24, 28 or 32 of 41 months and predicted the rest. Profit
  RMSE was 45–51 元/head against a spread of ±388, correlation 0.93–0.98,
  and the sign was right in 94–100% of months. With the same prices in the
  same week the cost error was 90; with the 13-week lag it was 33.
- **It is its own indicator, and says so.** 估算/estimated is in both names.
  The about text gives the method, the inputs and the measured error. The
  official series stays as it was, retired, and the two are never one line.
- **It is refitted at every export, from silver as known at the export's
  moment.** A past day sees only the model it could have had: before the
  official months were collected there is no estimate at all.
- **It has no release date.** Nobody released it. A row is knowable from the
  newest fetch among its inputs and its calibration (ADR-0017: a release
  date is read, never assumed).
- **It needs two years of overlap** (24 months) to fit. A lagged price must
  sit within a week of its target date. A gap in the weekly report is a
  week with no estimate, never a price borrowed from a month away.

Alongside it, gold's week-on-week `change` no longer gives a percentage when
either reading is at or below zero. A loss deepening from 352 to 382 per hog
had read as "+8.5%". The level and the streak carry such a series.

## Consequences

- The wall's margin tier has a current profit reading again. In the latest
  week it is a loss of 382 元/head, with breakeven at 13.70 元/kg against a
  500-county hog price near 11.
- Breakeven is on the 500-county price's caliber, so compare can draw the
  two on one axis without indexing. A price under the breakeven line is a
  loss.
- The coefficients freeze in effect: the official series no longer grows,
  so every export fits the same 41 months. If feed formulations or
  productivity drift, the error will grow unseen. That is the cost of a
  model with no fresh truth to check against. Watch whether the joint
  release ever prints cost again, and re-check against it if so.
- A second estimate needs the same: a stated model, a holdout test before it
  goes up, its error on the page, and its own name.
