# 26. Breaks in a series are drawn where they happen

Date: 2026-10-15 · Status: Accepted

Extends [ADR-0008](0008-granularity-is-a-row-property.md) (granularity on the
row) and [ADR-0018](0018-weekly-prices-from-the-ministry.md) (caliber bounds).

## Context

The project splits a series wherever its meaning changes. A caliber change
makes two indicators. A change of cadence keeps one indicator, and every row
records its granularity. But a reader learned of either only from a footnote
or a marker's shape:

- **Cadence.** 能繁母猪存栏 is annual to 2020, monthly from 2021-12 and
  quarterly-only after 2025-10. A solid line through all three read as one
  smooth monthly curve.
- **Caliber.** 白条肉出厂价 changed whom it surveys in the week of
  2024-01-01, and 定点屠宰量 changed in 2025-07. Each later series begins
  with a shaded band that said "data from …", as if nothing came before. The
  earlier caliber exists, as its own retired series, and the page did not say
  where.

## Decision

- **Joins across gaps are dashed** (frontend `charts/base/segments.ts`).
  Between readings more than 45 days apart nothing was measured, so the line
  between them only marks that they are joined. Annual and quarterly readings
  always carry hollow markers.
- **Gold computes cadence breaks** and the contract carries them as
  `panels[].breaks`: `[{d, from, to, settled}]`, with the cadence classed by the gap to
  the previous reading (D ≤ 3 days, W ≤ 10, M ≤ 45, Q ≤ 135, A beyond). A
  cadence counts once it holds for three consecutive gaps, and a break is a
  change between two that count. Two missed 行情宝 weeks in 2026-04 and
  玄田's irregular 2018-2019 gilt prices are not breaks; a missed reading is
  a gap, which the dashes already show. Classing by gap rather than by the
  row's label is deliberate: the chart should show what the readings are.
  On today's data there are three breaks: 能繁母猪 annual → monthly at
  2021-12 and monthly → quarterly at 2025-10, and the gilt price weekly →
  monthly at 2021-06, where it moved from 玄田 to the ministry. Each is drawn
  as a labelled dotted line at `d`, inside the window only. Where two labels
  would collide, the later one is drawn bare.
- **A break is knowable from its `settled` reading**, the third gap of the
  new cadence. Before that, nobody could tell a new cadence from a missed
  reading, so a page standing on an earlier day (ADR-0025) does not draw it.
  On the release-aligned view a break moves with the reading it starts from.
- **Caliber lineage is config.** `continues: <id>` on a spec names the series
  whose earlier caliber it continues. 白条肉出厂价（定点屠宰企业） continues
  the 规模以上 series. 定点屠宰量（全口径） continues its 规模以上
  predecessor, and gains `caliber_from: 2025-07-01`. The loader rejects
  an unknown target. The contract carries `panels[].caliber`
  (`from`, `until`, `earlier`, `later`). The band before a continuing series
  says "new caliber from 2024-01" instead of "data from". Each series page
  links to the other: the later one to the caliber before it, the earlier
  one to where it continues.

Both fields are optional, so the contract goes to **1.2.0**.

## Consequences

- Nothing is joined. A caliber change is still two panels, and this only
  says on the chart, at the date, what the config already knew.
- A break is a computed fact with a fixed definition, like a streak. It says
  how often readings arrive, not what they mean.
- The overlay (compare) still draws solid lines. It indexes and shifts series
  and has its own legend, and dashes there are left for when it is next
  reworked.
