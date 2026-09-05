# hogcycle

A bitemporal data warehouse and dashboard for the China hog cycle (猪周期).

## Why this exists

`akshare` already returns every series this project needs, in one line each.
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

## Layout

```
config/sources.yaml         indicator registry — adding a series is config, not code
src/hogcycle/
  schema.py                 the Observation contract + batch validation
  registry.py               yaml -> typed IndicatorSpec
  bronze.py                 immutable content-addressed raw snapshots
  silver.py                 append-only bitemporal store, as_of() queries
  pipeline.py               fetch -> bronze -> normalise -> validate -> silver
  collectors/
    base.py                 Adapter protocol; the impure/pure split
    akshare_adapter.py      the only file that knows akshare exists
tests/                      revision, dedupe, lookahead, unit-drift, parser-break
```

Modules are split **by data source, not by technical layer**. Each source has its
own failure mode, cadence and 口径; all of that ugliness is confined between
bronze and silver. The gold layer never learns which website a number came from,
so adding an indicator touches one config entry and, at most, one adapter.

## Layer rules

**bronze** — raw payload, verbatim, never edited or deleted. Content-addressed,
so a day where nothing changed costs one manifest line and zero payload bytes.
A parser bug is then fixable offline: correct the parser, rebuild silver, no
re-fetch. You cannot re-fetch yesterday.

**silver** — append-only. A revision is a new row beside the old one, never on
top of it. `append_changes()` writes only values that actually moved, so a daily
job on a stable series costs nothing.

**gold** *(next)* — derived series: 猪粮比 from price ÷ corn, 成本价差, and the
lag-aligned 能繁母猪 → 猪价 overlay. The only layer that needs domain knowledge.

## Usage

```bash
pip install -e ".[dev]"
pytest -q
hogcycle collect              # all indicators; one failure does not abort the rest
hogcycle status               # coverage and latest obs_date per series
hogcycle revisions --indicator sow_inventory
```

## Data sources and caveats

All series come through `akshare`, which wraps 玄田数据/中国养猪网 and 搜猪网 —
JSON endpoints rather than scraped HTML, which is why no scraper lives here.
Both sites disallow crawlers in `robots.txt`; akshare hits their data APIs
directly, and this project stays polite by fetching once daily.

Known traps, encoded in `sources.yaml`:

- **能繁母猪 caliber.** Quarter-end months come from 国家统计局; other months are
  extrapolated from 农业农村部 定点监测 month-on-month rates. Different reliability,
  same column.
- **正常保有量 is a moving baseline** (4100 → 3900 → 3750万头). Any gap or ratio
  must use the baseline in force at the time, not today's.
- **Two hog-price calibers exist** (玄田 vs 农业农村部 500-county). Never plot
  them as one line.
- **PSY efficiency offsets herd cuts.** A 5% fall in sows is not a 5% fall in
  supply. Any capacity→supply model needs a productivity term or it will be
  wrong in exactly the direction that costs money.

## Status

Vertical slice complete: config → fetch → bronze → validate → silver → as-of
query, with tests. Frontend (SvelteKit + Observable Plot) and the gold layer are
next; the lag-alignment chart is the first thing worth building there.
