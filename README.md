# hogcycle

A bitemporal data warehouse and dashboard for the China hog cycle (猪周期).

## Why this exists

`akshare` already returns most series this project needs in one line each.
So the interesting problem is not fetching — it is that a plain fetch gives you
**today's version of history**, and the single most important indicator in the
cycle (能繁母猪存栏) is revised after the fact.

That makes the obvious question unanswerable:

> Would a capacity-based signal have called the turn *before* the price moved,
> using only what was knowable at the time?

You cannot check that against a table that silently absorbs revisions. So the
store keeps two time axes and never overwrites:

| axis | column | meaning |
| --- | --- | --- |
| valid time | `obs_date` | the date the number describes |
| transaction time | `fetched_at` | the moment we learned it |

`SilverStore.as_of(moment)` then reconstructs the state of knowledge at any past
date. Everything else in the repo exists to keep that guarantee honest.

```
--- knowledge as of 2026-05-01 ---     --- knowledge today ---
  2025-12-31  4038.0                     2025-12-31  4038.0
  2026-03-31  3920.0                     2026-03-31  3904.0   <- revised
                                         2026-06-30  3780.0
```

There is a second, blunter reason to run the collector daily, and it has
nothing to do with revisions: akshare's **daily** series are a rolling ~1-year
window. Data older than that disappears from upstream entirely. Skip a year and
that year is gone from every free source.

## Layout

```
CLAUDE.md                   working rules for this repo
docs/adr/                   why the architecture is the way it is
docs/specs/                 what each phase builds
contracts/                  the frontend/backend interface — one JSON Schema
config/sources.yaml         indicator registry — adding a series is config

backend/src/hogcycle/
  contracts/                the Observation contract + batch validation
  registry/                 yaml -> typed spec; Chinese period-label parsing
  collectors/               Adapter protocol; the impure/pure split
  storage/                  bronze (immutable) and silver (append-only)
  gold/                     derived series for the wall
  export/                   gold -> contract JSON
  cli/

frontend/src/
  charts/                   ECharts panels + the connected wall
  components/               tiles, table view, theme
  types/generated/          generated from contracts/ — never hand-written
```

Modules are split by **data source and responsibility, not by technical layer**.
Each source has its own failure mode, cadence and 口径; all of that ugliness is
confined between bronze and silver. The gold layer never learns which website a
number came from.

## Layer rules

**bronze** — raw payload, verbatim, never edited or deleted. Content-addressed,
so a day where nothing changed costs one manifest line and zero payload bytes.
It is written *before* parsing, so a parser bug is fixable offline: correct the
parser, rebuild silver, no re-fetch. You cannot re-fetch yesterday.

**silver** — append-only. A revision is a new row beside the old one, never on
top of it. `append_changes()` writes only values that actually moved.

**gold** — pure derivation, rebuildable in seconds, therefore gitignored. It
computes and aligns; it does not judge. No rule here emits "we are in the
deleveraging phase" — with roughly three cycles of usable history, any such rule
is fitted to its own sample.

## Usage

```bash
pip install -e "./backend[dev]"
cd backend && pytest -q

hogcycle collect              # all indicators; one failure does not abort the rest
hogcycle status               # coverage and latest obs_date per series
hogcycle revisions --indicator sow_inventory
hogcycle export               # gold -> frontend/src/data/wall.json
hogcycle export --as-of 2026-01-01   # rebuild the wall as it stood that day

cd frontend && npm install && npm run dev
```

## Data sources and caveats

Prices and equities run through `akshare`, which wraps 玄田数据/中国养猪网 and
行情宝 — JSON endpoints rather than scraped HTML. Capacity comes straight from
the publisher: the 农业农村部 生猪专题 月度数据, a joint release by 农业农村部、
发改委、商务部、海关总署 and 国家统计局, one XLSX per month. This project stays
polite by fetching once daily, by sharing one call between indicators that read
different columns of the same table, and by re-reading only a short trailing
window of published editions.

That split was learned the hard way. 能繁母猪存栏 used to come through akshare
too, whose upstream was a *mirror* of the same government release — and the
mirror froze in 2025年10月 while continuing to serve its last rows, so the
collector reported success every morning for eleven months. `hogcycle status
--fail-on-stale` now treats a series that has stopped advancing as a failure.
See [ADR-0013](docs/adr/0013-sow-inventory-moves-to-the-primary-source.md).

Traps, all encoded in `sources.yaml`:

- **能繁母猪 mixes three granularities in one column.** 2009-2020 are annual
  (a frozen 玄田 snapshot, replayed from bronze — no live source has them);
  2021-12 → 2025-10 is month-end; 2026 onward is quarter-end only, because the
  public cadence changed. Quarter-end figures are 国家统计局 survey data; the
  monthly ones were extrapolated from 农业农村部 定点监测 month-on-month rates.
  Different reliability, same column — so every row carries its own
  `granularity`, and for this series granularity also encodes caliber.
- **屠宰量 changed caliber in 2025-07** (规模以上 → all 定点屠宰企业) and the
  level stepped up with it. Two indicators, never one line; the closed one is
  marked `retired`, so its absence is expected rather than a daily failure.
- **正常保有量 is a moving baseline** (4100 → 3900 → 3750 万头). Any gap or
  ratio must use the baseline in force at the time, not today's.
- **Three hog-price calibers exist** (玄田 全国均价, 行情宝 平台成交, and
  农业农村部 500-county). Never plot them as one line; each gets its own panel.
- **玉米 is quoted in 元/吨**, not 元/公斤. Unit reconciliation happens in gold,
  so silver stays faithful to the source.
- **PSY efficiency offsets herd cuts.** A 5% fall in sows is not a 5% fall in
  supply. Any capacity→supply model needs a productivity term or it will be
  wrong in exactly the direction that costs money.

## Status

Phase 1 complete: config → fetch → bronze → validate → silver → gold → contract
→ static dashboard, with 41 tests over real captured payloads.

Next: 农业农村部 500-county as an independent second caliber (which also closes
margin arithmetic within one survey), then the bitemporal verification layer
that the storage was built for.
