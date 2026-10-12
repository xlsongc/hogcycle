# 17. The day a value became public is recorded, because that is what a backtest needs

Date: 2026-10-12 · Status: Accepted

Extends [ADR-0001](0001-bitemporal-storage.md). Corrects a claim made since
the project began.

## Context

The project was built on the expectation that 能繁母猪存栏 is restated after
the fact, so a history table that overwrote would let every backtest look
ahead. That is still true of an overwriting table, but the evidence for the
restatement itself is thin. In the 55 primary-source editions bronze holds
(2021-12 to 2026-07):

- a monthly edition prints only its own period, and never reprints an
  earlier one;
- each quarter-end figure from 统计局, divided back through the next
  quarter's printed 环比, recovers the previous quarter-end within rounding,
  every time;
- silver had recorded no restatement in five weeks of collection.

What the data does show is a lag. A month's figures appear 20 to 59 days
after the month ends, 28 at the median. When the release falls on a
holiday, two months come out together. For a leading indicator with a 10-12
month biological lead, a backtest that treats `obs_date` as the day a value
was known looks ahead by a month or two. `fetched_at` cannot correct that
for history: every row backfilled in 2026-09 carries a 2026-09 transaction
time, so "what was knowable on 2024-06-01" had no answer at all.

## Decision

### `published_on`, a nullable date on every silver row

It is the day the publisher released the value, when the source says so,
and NULL when it does not. It is never guessed. It is a date rather than a
timestamp because that is the precision the sources give.

- **农业农村部 monthly release.** The site's CMS names each upload
  `P0<yyyymmdd><n>.xlsx`. The name's date was checked against the server's
  `Last-Modified` and the workbook's own save time for all 55 editions. It
  falls on the same Beijing day as `Last-Modified` in 51 of them and one to
  three days earlier in the other four, which were re-saved. The save time
  is never later. So the name is the upload day, a lower bound on publication.
  A name without the stamp fails the batch.
- **畜牧兽医局 weekly reports** ([ADR-0018](0018-weekly-prices-from-the-ministry.md))
  carry `<meta name="PubDate">` to the minute, and it must agree with the
  date on the list page.

### Each release of a value is its own row

Rows are keyed by (`obs_date`, `published_on`), in validation and in silver:

- two releases printing different values for one period are a restatement,
  and both are kept;
- a later release repeating a value writes nothing, because the earliest
  release is when the value became knowable;
- a value already held without a release date is written again with one.
  The number has not moved, but when it became public is new knowledge, and
  it carries today's `fetched_at`.

`SilverStore.published(indicator, by=day)` answers the backtest's question:
for each period, the latest release on or before that day, out of what the
warehouse holds. It reaches back before collection began. `as_of` still
answers the audit's question, what this warehouse believed at a moment.

### Old parquet files are never rewritten

A file written before the column existed lacks it for good. The silver view
adds it as NULL when no file has it yet, and `union_by_name` does the same
once some do. `hogcycle replay` reads every bronze snapshot through today's
parser with zero HTTP requests. Dated rows are taken from every snapshot,
since a release read twice is the same release. Undated rows come only from
the newest snapshot, because an old snapshot's value may have been
superseded, and replaying it would make it current again.

The replay on 2026-10-12 added release dates to 291 rows across seven
农业农村部 series and changed no value. It also relabelled two granularities
that change detection had been hiding behind equal values: the 2021-2024
year-end sow figures (from `annual` to `quarterly`, the 统计局 quarter-end
they are) and the month-end gilt prices (from `weekly` to `monthly`).

### The page shows both placements

Points carry `p` where a release date exists, and panels carry a
`release_lag` summary (median, max, n). The overview's thesis chart can put
each sow reading at the period it describes or at the day it was published.
In the second view, readings from before 2021-12 have no release date and
are left out, not placed by assumption.

## Consequences

- The claim that 能繁母猪存栏 "is restated" is withdrawn from CLAUDE.md, the
  contract schema and the config. The reason for bitemporal storage is
  restated: it is the publication lag, the mirrors that disagreed with or
  went stale against their sources, the caliber changes, and parser fixes.
  The first restatement that does arrive will land as a second release row,
  with nothing more to build.
- The first restatement silver did record came from a source change, not
  from upstream. 玄田 had 2023-10-25 仔猪 as 25.36. The ministry's report
  says 25.63, and the switch to the primary source (ADR-0018) wrote that as
  a correction, released 2023-10-30.
- Release dates are a lower bound: the upload day, not the hour the page
  went live. For a monthly series a day's error is immaterial. It is stated
  rather than rounded up.
