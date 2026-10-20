# hogcycle

**English** · [中文](README.zh-CN.md)

A bitemporal data warehouse and dashboard for the China hog cycle.

Live: **https://xlsongc.github.io/hogcycle/** (English) ·
[中文](https://xlsongc.github.io/hogcycle/zh/)

## Why this exists

`akshare` already returns most of the series this project needs in one line
each. So the interesting problem is not fetching. A plain fetch gives you
**today's version of history, dated by the period each number describes**,
and that cannot answer the question that matters:

> Would a capacity-based signal have called the turn *before* the price moved,
> using only what was knowable at the time?

Two things break it. A history table silently absorbs corrections, source
switches and caliber changes. And breeding sow inventory, the one real
leading indicator, becomes public **20 to 59 days after** the period it
describes (28 at the median). A backtest that treats the period's date as
the day it was known looks a month or two ahead. So the store keeps three
times and never overwrites:

| time | column | meaning |
| --- | --- | --- |
| valid time | `obs_date` | the period the number describes |
| transaction time | `fetched_at` | the moment this warehouse learned it |
| publication time | `published_on` | the day the publisher released it, when the source says so |

`SilverStore.as_of(moment)` reconstructs what the warehouse believed at any
moment. `SilverStore.published(indicator, by=day)` reconstructs what anyone
could have known on any day, including days before collection began. Two
real rows from silver:

```
能繁母猪存栏  2026-06-30  3780.0   published 2026-07-23   learned 2026-10-12
仔猪价格      2023-10-25  25.36    (mirror, undated)      learned 2026-09-06
              2023-10-25  25.63    published 2023-10-30   learned 2026-10-12  <- the ministry's own number
```

The second is the mirror this project used to read, which had mistyped one
week. The switch to the primary source recorded the correction instead of
overwriting it. The project was built expecting 能繁母猪 itself to be
restated. In the 55 primary-source editions held, it never was
([ADR-0017](docs/adr/0017-publication-date-is-a-third-time.md)). A
restatement would land as a second release row.

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
  charts/                   ECharts panels, the wall, time-synced crosshair
  components/               page bodies, overview cards, nav
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
hogcycle replay               # re-parse every bronze snapshot, zero HTTP requests

cd frontend && npm install && npm run dev
```

**Where collection runs.** 农业农村部 refuses GitHub's runners (HTTP 403)
and 玄田 never answers them, while both serve an ordinary connection. So
the sources marked `reach: cn` are collected by
`scripts/local-collector/collect.sh` from a normal machine, in its own clone,
and `install.sh` schedules that daily with launchd. The GitHub run collects
the rest (`--reach anywhere`) and checks *every* series for staleness, so it
is also the watchdog for the local job
([ADR-0022](docs/adr/0022-collect-where-the-source-answers.md)).

## The site

Two languages, each **prerendered as its own page** — English at `/`, Chinese
at `/zh/`. The switch is a link rather than a toggle, so each version has a URL
that can be shared and indexed and a correct `lang` attribute in the markup it
serves. Indicator names travel in the contract in both languages, because the
caliber lives in the name and a lookup table on the frontend would be free to
drift from it. See [ADR-0014](docs/adr/0014-the-site-speaks-two-languages.md).

Each language has three pages:

- **Overview**: where the cycle stands, as three readings in causal order
  (capacity, price, margin). Each gives its direction, how unusual it is,
  the period it describes and the day it was published. Below them: the
  thesis (breeding sows shifted by the biological lag, above the hog price,
  placed at either the period or the publication date); the latest releases;
  facts with fixed definitions, never a phase call; and every reading in one
  table. See [ADR-0019](docs/adr/0019-the-overview-answers-one-question.md).
- **Causal-chain wall**: every cycle series on one time axis. Hover to read
  every panel at one date, drag to zoom, double-click to reset. The time
  axis stays pinned while the wall scrolls.
- **Compare**: any series on one axis, with one shiftable to test a lead.
- **A page per series** (`/series/<id>/`): what it is and who publishes it,
  the full history, how late it becomes public, its revision trail, and a
  CSV download. Every series name on the site links to its page.

Every view (window, zoom, selection, shift) lives in the URL, so a view is a
link. See [ADR-0016](docs/adr/0016-pages-and-a-crosshair-synced-by-time.md).

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

It caught the same mirror freezing three more weekly tables in August 2026,
and then the run stayed red for 26 days unread, which is its own kind of
silence. Now a freeze opens a GitHub issue, and the page marks a stale reading
as stale. A known outage can be acknowledged with a deadline of at most 92
days, after which the alarm returns on its own. See
[ADR-0015](docs/adr/0015-acknowledged-outages-expire.md).

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

Phase 2 is mostly done ([plan](docs/specs/2026-10-14-phase-2-upgrade.md),
[what is left](docs/specs/2026-10-19-next-steps.md)). The pipeline runs
config → fetch → bronze → validate → silver → gold → contract → static site,
with 229 backend tests, the adapters among them over real captured
payloads, and 24 for what the browser computes. 39
collected series and 5 derived ones are published in English and Chinese.

- **Time travel.** Every page can stand on a past day and shows only what was
  knowable then: a dated value from its release, an undated one from the day
  this warehouse learned it, never by an assumed lag (ADR-0025).
- **Primary sources.** Every 农业农村部 row carries its release date; weekly
  prices come from the ministry's own reports; the joint release adds
  imports, cost and profit per head, 发改委's ex-farm price, and 统计局's
  output, taken per quarter from its year-to-date totals (ADR-0030). USDA is
  the foreign, self-revising second account (ADR-0021).
- **A run that stops is loud.** Series staleness, a heartbeat per source
  group, failures classed as transient, blocked or structure, a run record
  committed with the data, shape drift named before a parse (ADR-0032), and
  a release calendar that says when each next value is due (ADR-0031).
- **Readers.** Breaks in cadence and caliber are drawn where they happen,
  terms are explained where they appear, panels read from the keyboard, any
  series is one keystroke away (`/`), and the phone layout is its own. A
  series page gives the facts of any window the reader picks and lays its
  cycles over each other from starts the reader names; the browser computes
  only over such choices, and says so (ADR-0033). Revised periods are ringed,
  and every chart has a table twin.
- **A platform, not only a wall.** A weekly estimate of what a scale farm
  earns per hog and its breakeven price, since the official figure stopped
  (ADR-0034), tested out of sample before it went up. The Dalian futures
  curve, as the market's expectation and never ours (ADR-0035). Units,
  seasonal and lag views on every series. Atom feeds, and every series as
  CSV and JSON with an index at `data/index.json`.

Next: a machine-readable source for 发改委's 猪粮比价 before its
acknowledgement lapses on 2026-12-31; then the verification layer the storage
was built for, a backtest that reads only `published()`.
