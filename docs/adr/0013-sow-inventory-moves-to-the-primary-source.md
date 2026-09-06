# 13. 能繁母猪存栏 moves to the primary source, and staleness becomes a failure

Date: 2026-09-06 · Status: Accepted

Supersedes the sourcing half of [ADR-0003](0003-akshare-single-adapter.md);
substantially reduces the cost assumed in [ADR-0005](0005-mara-second-caliber.md).

## Context

`sow_inventory` is the only real leading indicator in this project and the
reason the warehouse is bitemporal at all. It was collected through akshare's
`futures_hog_supply(symbol=生猪产能)`, whose upstream is **玄田数据**
(`xt.yangzhu.vip`) — a third-party mirror of a government release.

Verified 2026-09-06 against the live endpoint:

    rows: 22    last period: 2025年10月

The mirror stopped updating eleven months ago and kept serving its final 22
rows. `能繁母猪` appears in exactly one place in all of akshare, so there was
no alternative behind the same dependency.

What the board was missing, from the 统计局 release the mirror stopped
copying:

| 期间 | 存栏(万头) | 占基准 | 基准 |
|---|---|---|---|
| 2025-10 (our last value) | 3990 | 102.3% | 3900 |
| 2026Q1 | 3904 | 100.1% | 3900 |
| 2026Q2 | **3780** | 100.8% | **3750** |

Capacity down 6.5% year on year, and the 正常保有量 baseline itself cut from
3900 to 3750 by 《生猪产能综合调控实施方案（2026年修订）》. The dashboard was
blind to the single most important development in its own subject.

### Sources evaluated

| Source | Structured | Reachable (NL, no VPN) | Verdict |
|---|---|---|---|
| akshare / 玄田 mirror | JSON | yes | **stale since 2025-10** |
| 统计局 `data.stats.gov.cn` | JSON API | **no** — 403 WAF `UrlACL` | needs a China VPN; also 403 from a second egress, so it is a broad ACL, not our IP |
| 统计局 `www.stats.gov.cn` articles | prose | yes | cross-check only; URLs are opaque ids (`t20260716_1964140`) and unguessable |
| 农业农村部 `zdscxx` 数据库 | JSON | yes | image-CAPTCHA gated; not bypassed |
| **农业农村部生猪专题·月度数据** | **XLSX** | **yes** | **chosen** |

## Decision

**1. Collect `sow_inventory` from the 农业农村部 joint release.**

`https://www.moa.gov.cn/ztzl/szcpxx/jdsj/{YYYY}/{YYYYMM}/`, one XLSX per
edition, published jointly by 农业农村部、国家发展改革委、商务部、海关总署 and
**国家统计局** — so the 存栏 figure is the 统计局 number itself, not a
third-party restatement. 54 editions exist (2021-12 → 2026-07), 53 with a
workbook.

Validated: all ten dates the two sources share agree exactly (4329, 4390,
4142, 4078, 4039, 4042, 4038, 4035, 3990, …). Same caliber, strict superset,
and current.

**2. Keep the indicator id, and keep the pre-2021 history in bronze.**

The 2009–2020 annual values exist in no live source now. They stay in silver
where they already are, with their own `source` on every row, replayable from
the frozen 玄田 bronze snapshot — which is exactly what bronze immutability is
for. A regression test pins that replay.

**3. Match the 指标 name exactly, never by substring.**

`生猪定点屠宰企业屠宰量` is a substring of `规模以上生猪定点屠宰企业屠宰量`,
and the 2025-07 caliber change widened that survey's coverage and stepped the
level up. Substring matching would have welded two calibers into one line.
They are two indicators, and the closed one is marked `retired`.

**4. A series that stops advancing is a failure, not a quiet day.**

`hogcycle status --fail-on-stale` compares `max(obs_date)` against a limit
derived from the series' own frequency. This is the rule CLAUDE.md was
missing: "a silently empty collection is worse than a failed one" did not
cover a collection that succeeds, returns data, and is dead.

## What the guard found on its first run

Two more frozen series, neither of which anyone had noticed:

- **`meat_price_index`** — 340 days stale. 玄田's 肉类价格指数 table died in the
  same month as its 生猪产能 table: upstream's own last row is 2025-10-01. One
  mirror outage had silently taken out two indicators, not one. Marked
  `retired` so CI does not go permanently red, and replaced in the price tier
  by `pork_retail_price` (36城精瘦肉零售价, from the joint release — the
  original rather than a mirror).
- **`sow_binary_price`** — 68 days stale, and the alarm exposed a config bug
  underneath: `freq` said `weekly` while upstream returns month-end dates. It
  is monthly. It was also mirroring 发改委 all along — 玄田's last value
  (26.77) is digit-for-digit the joint release's 2026年6月份全国二元母猪销售
  价格, and the release already had July. Re-sourced to `moa`.

Three of the project's nineteen series were being fed by one abandoned mirror,
and the only reason that was invisible is that a frozen series and a quiet one
produce identical logs.

`retired` is doing two jobs and the distinction matters when reading it:
`slaughter_above_scale` is *closed* (upstream deliberately replaced the
caliber), while `meat_price_index` is merely *unreachable* (the only source we
have stopped). Both suppress the alarm; only the second is worth revisiting.

## Consequences

- **The leading indicator's public cadence is now quarterly.** Monthly prints
  ran 2021-12 → 2025-10; from 2026 only quarter-ends are published, ~20 days
  after quarter end. We cannot fix that — it is upstream policy. `granularity`
  on each row records which kind of reading it is, and `max_age_days: 150`
  keeps the guard from crying wolf every October.
- **ADR-0005 got much cheaper.** It assumed ~520 prose bulletins to parse for
  a second caliber. The same releases carry, structured and monthly: 生猪存栏,
  屠宰量, 500-县 仔猪价格 and 县乡集贸市场猪肉零售价格, 发改委 生猪出场价格,
  200-市场 白条猪批发价, 36-城 retail, and 海关总署 进出口. Only 生猪存栏 and
  屠宰量 are wired here; the rest are config entries, not new code.
- **Every caliber is documented in the source itself.** Each edition's 指标说明
  names the publishing body and survey design per indicator, including caliber
  breaks. That is the project's hardest rule arriving as data.
- **The moving baseline is recoverable.** Each release states 「相当于正常保有量
  的X%」; dividing reproduces 4100 → 3900 → 3750 exactly. Not collected —
  silver stores what the source states, and the division is a gold-layer
  derivation if we ever want the series.
- akshare is no longer "the only module that knows a source exists"; the
  pipeline dispatches on `spec.adapter`. ADR-0003's *pure/impure split* stands
  and the new adapter follows it. Its claim that akshare wraps every source
  this project needs does not.
- One risk stays open: `www.moa.gov.cn` is reachable from a residential NL IP,
  but whether GitHub's Azure runners reach it is unverified. `data.stats.gov.cn`
  proves .gov.cn hosts do block by IP range. The daily workflow settles it.
