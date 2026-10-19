# 32. A payload that changed shape says how, before it is parsed

Date: 2026-10-19 · Status: Accepted

Extends [ADR-0028](0028-failures-are-classified-and-every-run-leaves-a-record.md)
(failures are classified, every run leaves a record) and
[ADR-0002](0002-medallion-layers.md) (bronze keeps every payload).

## Context

A renamed akshare column, a 指标 the workbook stopped printing, a figure the
weekly report renamed: each already fails loudly, as a `structure` error
naming the field the parser could not find. What the error could not say is
the next thing a person asks: since when, and what is there now instead? The
answer was always in bronze, in the snapshot before, and finding it meant
opening two blobs by hand.

## Decision

- **Each adapter says what names its payload carries.** akshare: the
  columns. The joint release: every 指标 name its workbooks print. The weekly
  report: every 「<name>为<n>元/公斤」 figure whose name ends in 价格 or 平均.
  USDA: the commodity, attribute and unit of each China row. Names only, not
  values or row counts. A value moves every day, and a window of editions
  gains and loses rows as it slides.
- **The pipeline compares them before parsing.** When a fetch brings new
  content, its names are set against the newest earlier snapshot from the
  same source. If they differ, the drift is described as names gone and
  names new, with the date of the snapshot they are measured from.
- **Drift is information, failure is still the parser's call.** When the
  parse succeeds, the drift is a warning in the log and goes into the run
  record. When it fails, the drift is added to the error. The class stays
  `structure`. A new 指标 in the workbook is news; a configured one gone
  fails because the parser cannot find it, as before.

## Consequences

- A rename reads as one: `gone [成交均价]; new [均价]`, dated, in the run
  log committed with the data.
- The joint-release window drifts when it slides past an edition that
  changed the table. Replayed over bronze, it flagged the 202508 edition,
  the last with 猪粮比价 and the cost and profit rows. That is the event the
  check is for, and it said so without being told to look.
- The weekly report's spellings vary (「生鲜乳平均」 one week, 「…平均价格」 the
  next), so its names drift as articles enter and leave the window. Those
  are warnings in a run record, not failures. A configured name still
  matches only exactly (ADR-0027).
- Each new snapshot costs one read of the previous blob. Today the largest
  is a few hundred kilobytes.
