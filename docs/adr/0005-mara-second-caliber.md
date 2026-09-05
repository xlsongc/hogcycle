# 5. 农业农村部 500县 as an independent second caliber

Date: 2026-09-05 · Status: Accepted (not yet implemented — phase 2)

## Context

Every series in phase 1 comes through akshare, and most of it originates from
one publisher (玄田数据). A single upstream is a single point of both failure
and systematic bias, and there is no way to tell a caliber artefact from a real
market move with only one measurement.

农业农村部 publishes weekly 500-county market prices covering 仔猪, 生猪, 猪肉
*and* the cost side (玉米, 豆粕, 育肥猪配合饲料). Verified 2026-09-05 against
the 2026-07-14 bulletin: 仔猪 22.43, 生猪 11.35, 猪肉 20.62 元/公斤. Neither
`xmsyj.moa.gov.cn` nor `zdscxx.moa.gov.cn` serves a robots.txt (both 404), so
no crawl restriction is declared — cleaner than the sources already in use,
which disallow crawlers and are reached through akshare's API calls.

## Decision

Add it as a second caliber in phase 2, with its own adapter.

## Consequences

- Margin becomes computable **within one caliber**: price and feed cost from
  the same survey. Cross-source margin arithmetic is a common silent error and
  this removes it. Phase 1 uses 猪粮比价 as a proxy instead.
- Cross-validation of official capacity data becomes possible.
- Cost: the bulletins are **prose, not tables** ("生猪价格 11.35 元/公斤，比
  前一周上涨 8.3%"), so the parser extracts numbers from Chinese narrative and
  will be brittle. Bronze immutability (0002) is what makes that acceptable.
- Backfill is ~520 archive pages for 10 years, unlike akshare where one call
  returns full history. This cost asymmetry is why it is its own phase.
- Unresolved: `zdscxx.moa.gov.cn:8080/nyb/pc/search.jsp` is titled 数据查询 and
  mentions 导出. If it is a real structured query endpoint it would replace
  prose parsing entirely. **Spike this before writing the parser.**
