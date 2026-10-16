# 27. A new series from a release already collected is read from the bronze it left

Date: 2026-10-16 · Status: Accepted

Extends [ADR-0002](0002-medallion-layers.md) (bronze is never
modified) and [ADR-0018](0018-weekly-prices-from-the-ministry.md) (exact
names, caliber bounds).

## Context

Both ministry releases print more than this project reads. The weekly
500-county report has 豆粕 and 猪肉 beside the corn, feed and hog prices
already collected. The monthly joint release has imports, exports, output,
and cost and profit per head.

Bronze is kept per indicator. A new indicator starts with no snapshots, and
replay reads only an indicator's own snapshots. So its history sat in bronze
under its siblings' ids, byte for byte the same payload, and the only way to
reach it was to fetch everything again: about 250 articles for a weekly
series, 56 workbook editions for a monthly one, from hosts that answer slowly
and refuse datacenter addresses.

Reading the history also turned up three things that need a ruling, not a
parser tweak.

## Decision

- **Replay reads every snapshot of the call, not only the indicator's own.**
  Indicators that share an adapter and its call arguments share one upstream
  response. Replay now reads the snapshots of all of them, deduplicated by
  snapshot id (content-addressed, so the same response has the same id under
  every sibling). As for every replay, rows land with `fetched_at` set to the
  replay, which is when this warehouse learned them. Nothing is fetched and
  nothing is written to bronze. The new indicator's own bronze begins with its
  first collect. Each sibling's snapshots still count only when they came from
  that sibling's current source. A series that changed publisher keeps its old
  payloads, which are another shape.
- **A publisher's spelling variant is listed, never matched by pattern.**
  `extract.also` names other exact spellings the publisher used for the same
  figure in the same report. The match stays exact, and two spellings printing
  different numbers in one article still fail the batch. Seen so far:
  「全国豆粕价格」 (2023-05-30) and 「全国猪肉平均」 without 价格
  (2023-02-21). Each was a single article among 250.
- **January imports are not stored.** Customs publishes January and February
  together. The February edition prints February's own figure (12.76 万吨 in
  2022) and the 1-2月 total (27.82), and January's figure appears nowhere.
  Subtracting one from the other would put a number nobody printed on a line of
  printed ones. The chart dashes across the gap (ADR-0026).
- **Year-to-date rows stay unread.** 累计, 1-n月, 上半年 and 前3季度 describe a
  span from January, and the model has no such period. 生猪出栏 and 猪肉产量
  appear only in that form, apart from 1季度 and 全年. They wait for a decision
  on how a year-to-date series is stored. The 202506 edition, which would have
  carried 2025's first half, has no workbook link.
- **A series the release stopped carrying enters as retired.** Cost, value and
  net profit per head, for scale and backyard farms, are in every edition up
  to 202508 and in none since. Whether the 发改委 survey behind them goes on
  elsewhere is not known here. The release that carried them closed them, so
  they enter `retired: true`: kept, in compare, and off the wall.

## Consequences

- A new series has its history on its first day. It is knowable from its
  releases, which are dated, so time travel places it correctly (ADR-0025).
- Replay reads each distinct payload once per indicator that uses it, so it
  grows with the number of siblings. Today that is seconds.
- A variant in `also` is a claim that two spellings name one figure, made by a
  person and kept in config, where it can be argued with. A pattern would make
  the same claim silently, about spellings nobody had seen yet.
