# hogcycle

**English** · [中文](README.zh-CN.md)

A bitemporal data warehouse and dashboard for the China hog cycle.

Live: **https://xlsongc.github.io/hogcycle/** (English) ·
[中文](https://xlsongc.github.io/hogcycle/zh/)

## Why this exists

`akshare` already returns most of the series this project needs in one line
each. So the interesting problem is not fetching — it is that a plain fetch
gives you **today's version of history**, and the single most important
indicator in the cycle, breeding sow inventory, is revised after the fact.

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
  app/(en)/ app/(zh)/       one prerendered root layout per language
  charts/                   ECharts panels + the connected wall
  components/               instrument header, tiles, table view, toggles
  i18n/                     every string the UI renders, in both languages
  types/generated/          generated from contracts/ — never hand-written
```

Modules are split by **data source and responsibility, not by technical
layer**. Each source has its own failure mode, cadence and caliber; all of that
ugliness is confined between bronze and silver. The gold layer never learns
which website a number came from.

## Layer rules

**bronze** — raw payload, verbatim, never edited or deleted. Content-addressed,
so a day where nothing changed costs one manifest line and zero payload bytes.
It is written *before* parsing, so a parser bug is fixable offline: correct the
parser, rebuild silver, no re-fetch. You cannot re-fetch yesterday.

**silver** — append-only. A revision is a new row beside the old one, never on
top of it. `append_changes()` writes only values that actually moved.

**gold** — pure derivation, rebuildable in seconds, therefore gitignored. It
computes and aligns; it does not judge. No rule here emits "we are in the
deleveraging phase" — with roughly three cycles of usable history, any such
rule is fitted to its own sample.

## Usage

```bash
pip install -e "./backend[dev]"
cd backend && pytest -q

hogcycle collect              # all indicators; one failure does not abort the rest
hogcycle collect --months-back 60    # backfill ministry editions (default 6)
hogcycle status               # coverage, latest obs_date and age per series
hogcycle status --fail-on-stale      # exit 1 if a series has stopped advancing
hogcycle revisions --indicator sow_inventory
hogcycle export               # gold -> frontend/src/data/wall.json
hogcycle export --as-of 2026-01-01   # rebuild the wall as it stood that day

cd frontend && npm install && npm run dev
```

## The site

Two languages, each **prerendered as its own page** — English at `/`, Chinese
at `/zh/`. The switch is a link rather than a toggle, so each version has a URL
that can be shared and indexed and a correct `lang` attribute in the markup it
serves. Indicator names travel in the contract in both languages, because the
caliber lives in the name and a lookup table on the frontend would be free to
drift from it. See [ADR-0014](docs/adr/0014-the-site-speaks-two-languages.md).

## Data sources and caveats

Prices and equities run through `akshare`, which wraps Xuantian Data /
Zhongguo Yangzhu Wang and Hangqingbao — JSON endpoints rather than scraped
HTML. Capacity comes straight from the publisher: the Ministry of Agriculture
and Rural Affairs' monthly hog-industry release, issued jointly with the NDRC,
MOFCOM, the General Administration of Customs and the National Bureau of
Statistics, one XLSX per month. This project stays polite by fetching once
daily, by sharing one call between indicators that read different columns of
the same table, and by re-reading only a short trailing window of editions.

That split was learned the hard way. Breeding sow inventory used to come
through akshare too, whose upstream was a *mirror* of the same government
release — and the mirror froze in October 2025 while continuing to serve its
last rows, so the collector reported success every morning for eleven months.
`hogcycle status --fail-on-stale` now treats a series that has stopped
advancing as a failure. See
[ADR-0013](docs/adr/0013-sow-inventory-moves-to-the-primary-source.md).

Traps, all encoded in `sources.yaml`:

- **Breeding sow inventory mixes three granularities in one column.**
  2009-2020 are annual (a frozen third-party snapshot, replayed from bronze —
  no live source still has them); 2021-12 to 2025-10 is month-end; 2026 onward
  is quarter-end only, because the public cadence changed. Quarter-end figures
  are statistics-bureau survey data; the monthly ones were extrapolated from
  the ministry's fixed-point monitoring. Different reliability, same column —
  so every row carries its own `granularity`, and for this series granularity
  also encodes caliber.
- **Slaughter volume changed caliber in July 2025** (plants above designated
  size → all designated plants) and the level stepped up with it. Two
  indicators, never one line; the closed one is marked `retired`, so its
  absence is expected rather than a daily failure.
- **The normal-holding target is a moving baseline** (41 → 39 → 37.5 million
  head). Any gap or ratio must use the baseline in force at the time, not
  today's.
- **Three hog-price calibers exist** (Xuantian's national average,
  Hangqingbao's platform transactions, and the ministry's 500-county market
  survey). Never plot them as one line; each gets its own panel.
- **Corn is quoted per tonne**, not per kilogram. Unit reconciliation happens
  in gold, so silver stays faithful to the source.
- **Sow productivity offsets herd cuts.** A 5% fall in sows is not a 5% fall in
  supply. Any capacity-to-supply model needs a productivity term or it will be
  wrong in exactly the direction that costs money.

## Status

Phase 1 complete: config → fetch → bronze → validate → silver → gold →
contract → static dashboard, with 69 tests over real captured payloads, and the
dashboard published in English and Chinese.

Next: the ministry's 500-county survey as an independent second caliber (which
also closes margin arithmetic within one survey), then the bitemporal
verification layer that the storage was built for.
