# 25. The page can stand on any past day, and shows only what was knowable then

Date: 2026-10-15 · Status: Accepted

Extends [ADR-0017](0017-publication-date-is-a-third-time.md) (the release
date) and [ADR-0024](0024-the-contract-is-versioned-and-validated.md) (the
versioned contract).

## Context

The project exists to answer one question: would the leading indicator have
called a turn, using only what was knowable at the time? Silver can answer
it. `published(indicator, by=day)` gives, for 2024-03-15, **2024年1月:
4,067 万头, published 2024-02-26**. No page could. And `hogcycle export
--as-of` answers a different question, what *this warehouse* believed on a
day. That cuts on `fetched_at`, so for any day before collection began
(2026-09-05) it returns nothing.

Points already carry `p`, the publisher's release date, and `revisions`
carries every print of a restated period. What a page cannot tell is when an
**undated** value became knowable. 5,924 of 7,618 points have no `p`:
行情宝, 玄田's daily tables, the equities and the pre-2021 sow figures.

## Decision

### What "knowable on day D" means

For each period, take its prints: the period's revision trail if it has one,
otherwise its point.

1. **If any print carries a release date, only dated prints count.** The one
   in force on D is the latest with `p ≤ D`. The publisher's own record
   supersedes a mirror's undated copy of it. 玄田's mistyped 25.36 for the
   2023-10-25 仔猪 price, learned 2026-09-05, must not displace the
   ministry's 25.63, published 2023-10-30. This is `published()`'s rule.
2. **Otherwise** the print in force is the latest this warehouse had
   *learned* by D, and the page says so: "the source does not date its
   releases; this warehouse learned it on …".
3. **A release date is never inferred.** An undated value learned on
   2026-09-05 is not knowable on 2024-03-15, even though 行情宝 surely
   published it within days. To show it would be to assume
   `published_on = obs_date`, which CLAUDE.md forbids.

### What the contract carries

- `panels[].learned`: the date this warehouse learned the panel's undated
  points. That is one date for most of them, the backfill.
- `points[].l`: only on an undated point whose learned date differs from its
  panel's: the forward-collected days.

That is about 2 KB on today's contract. Writing a date on every undated
point would have been about 100 KB. Both fields are optional, so the contract
goes to **1.1.0**. A 1.0 payload still renders. Its undated points simply
cannot be placed in time, and the page says that.

The CSV download gains a `learned` column for the same reason.

### Where the page offers it

- **Series pages and the wall** take an `asof` date, kept in the URL with
  everything else. Points not knowable on D are left out. A panel with none
  says why. The header reads the latest knowable value. A mark on the chart
  stands at D. Computed facts (streaks, extremes, percentiles, year-on-year)
  describe *today's* series, so they are **hidden** in this view and the
  page says so. Recomputing them in the browser would move gold's work to the
  page, and precomputing them for every day would be a second wall per day.
- **The overview stays on today.** Its cards are those facts; with them
  hidden, the as-of overview would be a thinner wall. It links to the wall
  instead.
- **`hogcycle published --indicator X --by D`** prints the same answer from
  silver, for a notebook or a check.

Choosing what was knowable is selection, not computation. The page filters
points it was given by dates it was given. No number on the page is computed
by the browser.

## Consequences

- The question in the README is answered on the page itself: on 2024-03-15,
  能繁母猪存栏 was last known as January's 4,067 万头, out since 2024-02-26.
- For any day before 2026-09-05, the undated series are absent: 行情宝,
  玄田 daily, 出栏均重, the equities. So is the overview's price card
  series. This is the rule working. The nearest dated price is the
  500-county weekly survey, from 2021-12.
- `export --as-of` keeps its meaning, the audit view, and its empty result
  now explains itself.
