# 31. The release calendar: an expectation, never a date

Date: 2026-10-19 · Status: Accepted

Extends [ADR-0017](0017-publication-date-is-a-third-time.md) (a release
date is read, never assumed) and [ADR-0013](0013-sow-inventory-moves-to-the-primary-source.md)
(staleness is a failure).

## Context

Staleness asks whether a series has stopped, and its limits are generous on
purpose: 100 days for a monthly print, 150 for 能繁母猪存栏 since it went
quarterly. A quiet month is not a dead source, and a guard that fired on
every late edition would be ignored. That leaves nothing between "fine" and
"stopped". A reader waiting on the third-quarter sow figure in late October
cannot tell from the page whether it is due tomorrow or already late.

The answer is in the releases already held. Every dated value says how long
after its period it came out: 20 to 59 days for the joint release, 4 to 13
for the weekly 500-county report.

## Decision

- **Gold computes `next_release` for each live, dated, non-daily series**
  with at least six dated releases. The next period is the latest one plus
  one step at the latest reading's cadence, so a series that went quarterly
  is expected quarterly. `usual` is that period's end plus the median lag,
  `by` is its end plus the longest lag on record.
- **Overdue means later than any release on record.** It is true when the
  export's day is past `by`. That is a fixed definition, like a streak, and
  it says nothing about why.
- **It warns and never fails.** `status` prints the expectation per series
  and lists overdue releases. `--fail-on-stale` ignores them. Overdue is a
  reason to look, and staleness still decides when a series has stopped.
- **It is never a date.** Nothing is written to silver. `published_on`
  stays what the publisher printed, and no code fills it from a period plus
  a typical lag. The page calls `usual` an expectation in those words.
- **The page shows it only on today.** A page standing on a past day hides
  the computed facts (ADR-0025), and this is one of them.

## Consequences

- The overview cards say when the next value is usually out, and the series
  page says when it would become late. An overdue release is listed under
  "worth noting" and tagged in the readings table, in ink rather than the
  stale red.
- The longest lag decides overdue, so one holiday cluster (two months out
  together after Spring Festival) sets the bar high for good. That is the
  price of never calling a normal late edition overdue. A series that keeps
  missing it is still caught by staleness.
- Customs prints no January of its own, so the import series expect a
  January value that never comes. With the longest lag as the bar, the
  February print arrives before that value counts as overdue.
