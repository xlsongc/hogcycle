# 39. The week is the difference between two Sundays

Date: 2026-10-24 · Status: Accepted

Builds on [ADR-0025](0025-the-page-can-stand-on-any-past-day.md) (what was
knowable on a day), [ADR-0031](0031-the-release-calendar-is-an-expectation.md) (the release
calendar) and [ADR-0033](0033-the-browser-computes-only-over-what-the-reader-chose.md)
(the browser computes only over what the reader chose). Step 2 of the
sequence in [making it pay](../specs/2026-10-21-making-it-pay.md), chosen by
the owner on 10-24 after deciding against analytics for now.

## Context

The site answers "where does the cycle stand" for a reader who opens it.
Most readers who follow a market do it once a week: a farmer checking
before a sale, an analyst writing a note, someone forwarding a link to a
WeChat group. They need what changed since last week, not the wall. The
site had no page to send, and nothing for a newsletter to carry if the
owner ever starts one.

A weekly summary is also where a site like this is most tempted to cheat. A
digest written today about last week, from today's data, quietly uses
revisions and backfills that nobody had then. This warehouse exists to not
do that.

## Decision

- **A week is the difference between two snapshots**: every series as it
  could be known at the end of the week, and at the end of the week
  before, by ADR-0025's rule (a dated value from its release, an undated one
  from the day this warehouse learned it). `gold/digest.py`; the snapshot
  is `vintage.in_force`, the same function as `hogcycle published`.
- **What a week holds**, all arithmetic, nothing judged:
  - *moves*: each daily and weekly series' latest reading against the
    latest a week earlier, with the week's high and low for a daily one. The
    same date on both sides means nothing new came out, and the page names
    such series under the table rather than printing a change of zero.
  - *released*: monthly, quarterly and annual periods that came out during
    the week, each against the period before at the same cadence, with year
    on year, and a revision with the value it replaced. A period filled in
    behind the latest one (a backfill) is not news and is left out; a series
    first knowable this week counts only its latest period.
  - *curve*: each listed futures contract's settle against a week earlier.
  - *upcoming*: what the calendar expects within seven days, or what is
    overdue. An expectation, as in ADR-0031.
- **Weeks are ISO weeks, Monday to Sunday**, from the first full week after
  collection began (2026-W37). The current week stands on the export's day
  and says it is not over.
- **In the contract** as `weeks` (1.8.0, optional). Each issue's page
  receives only its own week, so the other pages are not heavier.
- **Pages**: `/week/` is the current issue, `/week/2026-w43/` each issue at
  a stable address, in both languages. An issue leads with one sentence (the
  spot price, the futures price, the estimated margin) that is also its
  meta description, so a pasted link carries the week. The overview links
  to it in one line under its heading.
- **A feed, `week.xml`**, one entry per finished week, per language. It
  needs no account on either side, which is why it comes before any mailing
  list.

## Consequences

- A past issue reads as it stood. A figure revised the week after does not
  change it, and that is tested.
- **The early issues are thin, honestly.** Undated series appear only from
  the day this warehouse learned them, so the futures main contract starts
  in 2026-W43 and the margin estimate in W42. Dated series reach back to
  W37 in full.
- **A derived series has no prints of its own.** Its rows as computed now,
  each dated by its inputs, stand in, so a later revision of an input would
  show in a past week of it. The inputs are the ministry's weekly report,
  which has not revised a printed week so far.
- **Export cost grows by about 0.3 s per week** of history (1.9 s for seven
  weeks). Past a year it would be worth keeping finished weeks, which cannot
  change under the rule above, instead of recomputing them.
- If the owner starts a newsletter, its issue is this page: the text and
  numbers are already here, and the feed is what a mailing tool reads.
