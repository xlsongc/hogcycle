# 18. Weekly prices come from the ministry's own reports, and calibers get explicit bounds

Date: 2026-10-12 · Status: Accepted

Resolves two of the three outages acknowledged in
[ADR-0015](0015-acknowledged-outages-expire.md), and carries out
[ADR-0005](0005-mara-second-caliber.md).

## Context

`piglet_price` and `carcass_price` came from 玄田, a third-party mirror,
which stopped updating them in August 2026. Both numbers are 农业农村部
weekly reports, published as prose under 畜牧兽医局 · 监测预警:

| report | survey | period |
|---|---|---|
| 畜产品和饲料集贸市场价格情况 | 500 个县集贸市场和采集点 | one collection day per week |
| 生猪定点屠宰企业生猪收购和白条肉出厂价格情况 | 定点屠宰企业 | Monday-Sunday |

Checking the mirror against the reports week by week found it had been
copying them:

- 236 of 238 piglet weeks were identical. One was mistyped (25.63 → 25.36),
  and one was filed under another day.
- 142 of 142 carcass weeks were identical, and that included a **caliber
  change**. Until the week of 2024-01-01 the slaughter report averaged
  「全国规模以上生猪定点屠宰企业」; from then on, every designated plant.
  The level hardly moved (20.62 → 20.36, an ordinary week). Still, the
  survey changed who it asks, and the mirror served both periods as one
  table.

The third outage, `hog_corn_ratio`, has no machine-readable primary source.
发改委价格监测中心 publishes its weekly ratio on 中国价格信息网 as an
image, and the newest public issue is for 2026-06-24.

## Decision

### An adapter for the weekly reports (`moa_weekly`)

It reads the list pages and every matching article. Bronze stores each
article as tag-free text. The markup is a `<font>` per word and runs to ten
times the size of what it says, and the store is committed daily. The parse
is strict:

- A value is taken only from `<exact name>为<number>元/公斤`. 「全国生猪平均
  价格」 and 「全国仔猪平均价格」 differ by one character. The publisher's
  own typo 「为为」 is accepted, because the name and the number around it
  are unchanged.
- The period is a stated range or a 采集日. The year of a 采集日 comes from
  the publication, minus one when that would put it after publication.
- A release lag beyond 45 days fails the batch. Observed lags are 5 days at
  the median and 8 at p95. The longest are catch-ups: 16 days before May Day
  2026, and 23 days when three weeks went up together on 2025-08-26. The
  bound is about twice the longest seen, and exists to catch a 采集日 put
  in the wrong year.

The full list (25 pages) reaches 2021-12 for the market report and 2023-11
for the slaughter report.

### Caliber bounds on a spec

`caliber_from` and `caliber_until` say which obs_dates belong to an
indicator when one source's history crosses a caliber change. Rows outside
the bounds are left out at ingest and at read, because they are another
indicator's, not an error.

- `carcass_price`, 白条肉出厂价（定点屠宰企业）, comes from the ministry,
  from 2024-01-01.
- `carcass_price_above_scale`, 白条肉出厂价（规模以上定点屠宰企业）, is the
  mirror's history through 2023-12-31. It is retired, and appears in
  Compare only.
- The slaughter report's `scope` (`全部定点` or `规模以上`) is matched on the
  subject phrase of each article, never by substring.

### New series from the market report

`hog_price_county`, `corn_price_county` and `feed_price_county` are the 500
-county caliber ADR-0005 planned, each its own indicator.

### A ratio gold can compute honestly

`hog_corn_ratio_county`, 猪粮比价（500县集贸）, is 生猪 ÷ 玉米 from the same
article and the same collection day. It needs no alignment across sources
and no unit conversion. Over the 230 weeks it shares with the 发改委 ratio,
the two correlate at 0.996, but this one runs 0.26 lower on average and up
to 0.63 apart. So it is named for its caliber and carries no threshold: the
5:1 and 6:1 lines are defined on 发改委's. It is what the overview shows as
margin.

### A mirror's misdated copy is not drawn twice

Where the mirror filed a reading under another day than the primary did,
silver holds both rows. The wall leaves out an undated row only when a dated
row with the identical value sits within a period of it. That is 2026-02-19
in 仔猪价格, the mirror's date for the 2月第3周 collection on 02-24. An
undated row with no such twin is a real fill and stays, such as the
2025年2季度末 sow figure whose primary edition shipped without a workbook.

## Consequences

- `piglet_price` and `carcass_price` collect again, and their
  `upstream_dark` acknowledgements are removed. `hog_corn_ratio` keeps its
  acknowledgement until 2026-12-31. If 发改委 still has no machine-readable
  release by then, it is retired.
- `xmsyj.moa.gov.cn` is a new host for the daily run. It is reached the same
  way as `www.moa.gov.cn`, which the GitHub runner already collects from.
  The first scheduled run is the check.
- The contract grew by four panels, to about 320 KB. Splitting it per page
  is now worth doing.
