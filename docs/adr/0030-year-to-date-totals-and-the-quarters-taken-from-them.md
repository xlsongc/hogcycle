# 30. Year-to-date totals are stored as printed; a quarter is a difference gold takes

Date: 2026-10-19 · Status: Accepted

Settles what [ADR-0027](0027-new-series-from-a-release-already-collected.md)
left open ("year-to-date rows stay unread"). Extends
[ADR-0008](0008-granularity-is-a-row-property.md) (granularity is a property
of the row) and the derived-series rule in `gold/derived.py`.

## Context

生猪出栏 is where the sow herd of ten to twelve months earlier arrives as
supply: the link between the wall's first panel and its price panels. The
wall did not have it. 统计局 prints it, with 猪肉产量, in the five-ministry
monthly release, but only as a running total from 1 January:

    2024年1季度生猪出栏      19455
    2024年上半年生猪出栏     36395
    2024年前3季度生猪出栏    52030     (「前三季度」 in 2023)
    2024年生猪出栏           70256     (the whole year)

Bronze holds 18 such prints for each, 2021 to 2026's first half. The
202506 edition has no workbook, so 2025's first half is missing.

Drawn as printed, a running total climbs through the year and drops every
January. That sawtooth follows the calendar, and on a wall read as "where the
cycle is" it looks like a cycle.

## Decision

- **Silver stores each total as printed.** An indicator declares `ytd: true`,
  and the joint-release parser then reads the year-to-date labels: 1季度,
  上半年, 前3季度 / 前三季度, and the bare year. Each lands at the end of the
  stretch it covers, with the edition's release date. Without the flag those
  labels are never read, so a running total cannot pass for one quarter's
  reading. 「1-n月累计」 rows stay unread: no configured name follows them.
- **Every total is quarterly.** The prints arrive a quarter apart, and the
  whole-year total is the fourth of them. A total's granularity is its
  cadence, as for every other row (ADR-0008). What it covers is a fact about
  the indicator, kept in `ytd`.
- **A year-to-date series stays off the wall.** It is exported, has its own
  page, and can be put on compare beside anything else.
- **Gold takes the quarters.** `hog_output_quarter` and `pork_output_quarter`
  are derived series. Q1 is the 1季度 print. Each later quarter is the total to
  its end less the total to the end of the quarter before. A quarter is
  computed only when both totals were printed. It is knowable once the later
  of the two was released, and that is its `p`. These two are on the wall.
- **Nothing stands in for a missing total.** 2025's second and third quarters
  are not computed, because the first-half total is not held. They are not
  taken from the year's total less the other quarters. The chart dashes across
  the gap (ADR-0026).

## Why a difference here and not for January imports

ADR-0027 refused to compute January's imports as the 1-2月 total less
February. That would have put a computed value on a line of printed ones, in
the same indicator, under the same name. Here, every point of the derived
series is computed the same way, from printed totals only, under a name that
says so (「单季」), with an about text that says how. The printed totals stay
untouched in their own series. A reader can check every quarter against two
numbers on the series page of the totals.

## Consequences

- The wall gains its supply link: 16 quarters of 生猪出栏 and of 猪肉产量 from
  2022.
- A restated total restates the quarters on both sides of it. Silver keeps
  both prints, and the quarters follow the print in force (ADR-0001).
- A quarterly series of 16 points has no percentile or year-on-year yet
  (`MIN_HISTORY_FOR_PERCENTILE`, and the missing 2025 second quarter). Both
  arrive as the history does. Neither is filled in.
