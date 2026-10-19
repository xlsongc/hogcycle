# CLAUDE.md

Operating rules for working in this repo. Not a README — it says how to work
here, not what the project is for. For that, see `README.md`; for *why* things
are the way they are, see `docs/adr/`.

## What this project actually is

**A warehouse that remembers what it used to believe.**

能繁母猪存栏 (breeding sow inventory) is the only real leading indicator in
the China hog cycle — biology fixes a 10-12 month lag from sow to slaughter.
The question worth asking of it is "would this signal have called the turn
using only what was knowable at the time?", and a history table cannot
answer that. It has absorbed every correction, every source switch and every
caliber change, and it dates each value by the period it describes rather
than the day anyone could see it. A month's sow figure appears 20 to 59
days after the month ends (ADR-0017). A backtest on `obs_date` looks ahead
by that much, and every backtest on an overwritten table cheats.

So three times are kept: `obs_date` (what the value describes),
`fetched_at` (when this warehouse learned it) and `published_on` (when the
publisher released it). The project was built expecting 能繁母猪 to be
restated after the fact. In 55 primary-source editions it never was. The
store would keep a restatement as a second release, but do not cite one as
fact until silver holds it.

The bitemporal machinery is not résumé decoration. Delete it and the project
has no reason to exist.

## Layer rules — these are load-bearing

| Layer | Rule | What breaks if violated |
|---|---|---|
| **bronze** | Never modified, never deleted. Content-addressed. | A parser bug becomes unfixable — the page is gone and you cannot re-fetch yesterday. |
| **silver** | Append-only. A revision is a **new row**, never an overwrite. | Backtests silently look ahead; "my signal caught the turn" becomes unfalsifiable. |
| **gold** | Pure derivation. Rebuildable in seconds. Computes, never judges. | Nothing — it is a cache. That is why it is gitignored. |

`bronze.write()` runs **before** `normalise()` in the pipeline, on purpose: a
parser failure still preserves the payload, so the fix is replayable offline
with zero HTTP requests.

## Hard rules

- **No dual axis, ever.** Two y-scales on one plot align arbitrarily and
  invent a correlation the data does not contain. Mixed units go to small
  multiples, or get indexed to a common base on one axis. The overlay enforces
  this by construction (ADR-0012) — do not add an escape hatch.
- **Never mix calibers on one line.** 玄田 全国均价, 行情宝 平台成交价, and
  农业农村部 500县集贸市场 are three different measurements of "the hog price".
  Plotting them as one series is the single easiest way to produce a
  confident wrong answer. Each is its own indicator with its own panel.
- **正常保有量 is a moving baseline** (4100 → 3900 → 3750 万头). Any gap or
  ratio must use the baseline in force *at that time*, never today's. When in
  doubt, show the raw level and skip the ratio.
- **gold computes, it does not judge.** No rule in this repo emits "we are in
  the deleveraging phase". There are roughly three cycles of usable history;
  any such rule is fitted to its own sample and would look authoritative while
  being noise. Phase-calling belongs to the reader.
- **A silently empty collection is worse than a failed one.** Missing columns,
  unparseable labels and out-of-range values all abort the batch loudly.
  Never widen a range or add a fallback to make an error go away.
- **A series that stops advancing is a failure too.** This one has already
  bitten: `sow_inventory` came from a third-party mirror that froze in
  2025年10月 and went on serving its last payload, so every run reported
  `ok, 0 rows` — indistinguishable from a healthy quiet day — for eleven
  months. `hogcycle status --fail-on-stale` is the guard. When a series is
  genuinely finished because upstream closed a caliber, mark it `retired` in
  config; do not silence the guard by loosening a threshold.
- **A collector that stops is a failure too, on a clock of hours.** The
  `reach: cn` collector was never installed and nothing said so; the first
  staleness alarm was three weeks out. `status` now judges each source group
  by its newest bronze fetch (36h `anywhere`, 72h `cn`, ADR-0023). A failed
  fetch leaves no manifest line, so a job that runs and reaches nothing is
  as dead as one that never runs.
- **A known outage gets an owner and a deadline, not silence.** When the
  caliber is alive but the source we reach went dark, and the primary-source
  fix is not built yet, mark it `upstream_dark` with a `review_by` at most 92
  days out (ADR-0015). It stops failing the run until that date, then fails
  again by itself. Two weeks before that date `status` says it is about to
  lapse and an `ack-lapsing` issue opens, so the decision (fix, retire, or
  renew with a reason) is made before the run goes red. The page still shows
  it as stale: an acknowledgement quiets the collector, never the reader. A red run nobody reads hides the next
  freeze, which is why this exists. It is not a way to get CI green.
- **Prefer the primary source to a mirror.** A convenient wrapper around
  someone else's copy of a government release inherits their outages and
  their abandonment, and tells you about neither. When switching, check the
  two week by week before trusting either. The 玄田 copies had a mistyped
  week, a misdated week and a caliber change welded shut (ADR-0018).
- **A caliber change inside one source is two indicators.** When a survey
  changes whom it asks, split the history with `caliber_from` /
  `caliber_until`, even when the level barely moves.
- **A forecast declares itself.** Only a spec with `forecast: true` may carry
  future obs_dates or releases that precede their period. It stays off the
  wall, and the page quotes it as its source's, never as ours.
- **A release date is read, never assumed.** `published_on` is NULL when
  the source does not state it. No code may fill it from `obs_date` plus a
  typical lag.
- **Every adapter needs a real payload fixture.** All five inherited tests
  passed while the two most important indicators could not be collected at
  all, because every test fed itself a synthetic `date`/`value` frame.
  Fixtures are captured from bronze; see `backend/tests/fixtures/`.
- **Collect a source from where it answers.** A host that refuses datacenter
  addresses is `reach: cn` and is collected by `scripts/local-collector`.
  Never route around a 403 through a scraping proxy or by defeating the
  site's checks: the publisher's refusal is a fact about the source, not a
  bug in ours. A refusal is classed `blocked` and never retried; only a
  `transient` failure is (ADR-0028).
- **The daily run is not optional.** akshare's *daily* series are a rolling
  ~1-year window: data older than that disappears from upstream entirely. The
  collector runs to preserve data before it is deleted, not only to catch
  revisions.

## Frontend/backend boundary

```
Python  →  contracts/wall.schema.json  →  TypeScript
```

The frontend **never** touches parquet, DuckDB, akshare, or pandas. Its only
input is one JSON document whose shape is pinned by the schema, and its types
are generated from that same schema — never hand-written.

Phase 1 delivers that document as a build-time file. When an HTTP API arrives
it serves the identical shape at the same path, and no frontend code changes.

**Indicator names and descriptions are contract data, in both languages.**
A new indicator needs an entry in `config/about.yaml` (publisher, source
page, what it is); the export fails without one. `name_zh`/`name_en`
on every panel and reading, `label_zh`/`label_en` on every threshold, both
required. The caliber lives in the name — 定点屠宰量（全口径） and
定点屠宰量（规模以上） are different measurements — so a translation table on
the frontend would be free to drift from a distinction the backend enforces.
Units are the exception: `unit` stays in the source's own form because `fmt()`
keys on it, and only its *display* is localised (`unitOf`). Never rescale a
value to suit a unit label.

## Code style

- **Modular design. One module, one job.** If you cannot say what a file does
  in a sentence, split it.
- **500 lines is the hard ceiling for any source file.** Past that, split —
  no exceptions, no "this one is cohesive".
- Comments explain *why*, never *what*. The tricky parts here are all domain
  traps (calibers, granularity, revisions); those deserve comments. Restating
  the code does not.
- Python: `ruff check` must be clean. Type hints everywhere.
- TypeScript: `strict`. No `any`.
- **Two pixel grids, and each page picks one.** Departure Mono is drawn on
  11px, zpix on 12px; at any other size a pixel face is resampled and goes
  soft. The `--type` token carries the current page's grid: 12px by default,
  11px under `html:lang(en)`, because the English page is entirely Latin.
  Prose sizes read `var(--type)` rather than hard-coding one language's
  number; numerals-only elements take `.num` (11px) in both.
  `--mono`/`--sans` list Departure Mono first so Latin resolves there and CJK
  falls through to zpix.

- **UI copy lives in `frontend/src/i18n/`, never inline in a component.**
  `en.tsx` is the reference shape and `zh.tsx` is typed `Dict = typeof en`, so
  a missing translation is a compile error instead of an English sentence in a
  Chinese paragraph. Add copy to both, or neither.
- **The CJK font is subset to what the app renders.** Add UI copy or an
  indicator whose name uses a new character and it will fall back to a system
  face mid-sentence. Re-cut with `frontend/scripts/subset-cjk-font.sh`.
  zpix is *not* an open licence — see `frontend/src/fonts/Zpix-NOTICE.md`.
- **Small-multiple panels sync by time, never by index.** `echarts.connect()`
  links pointers by data index, which puts panels of different frequencies
  on different dates. Use `charts/base/pointerSync.ts` (ADR-0016).
- **Nothing on a card is invented.** Every line on an overview card is a
  fact gold computed or a field the contract carries. A decorative number
  next to real ones makes the reader trust neither (ADR-0019).
- **Direction is shown, not judged.** No red-for-down or green-for-up: the
  same move is good news to one reader and bad news to another, and red
  means "up" on a Chinese market screen.
- Errors name what they saw. `no value column 能繁母猪存栏 in ['周期', ...]`
  beats `KeyError`.

## Commands

```bash
# backend (from repo root, with .venv active)
hogcycle collect                     # all indicators; one failure does not abort the rest
hogcycle collect --months-back 60    # backfill 农业农村部 editions (default 6)
hogcycle collect --indicator a,b --weekly-pages 25   # backfill the weekly reports
hogcycle replay                      # re-parse every bronze snapshot, zero HTTP; indicators on one
                                     # upstream call read each other's (a new series gets its history)
hogcycle collect --reach anywhere    # what the GitHub run collects
scripts/local-collector/collect.sh   # the `reach: cn` sources, from an ordinary network
hogcycle status                      # coverage, latest obs_date, and age per series; source
                                     # groups with their last run (data/runs, ADR-0028)
hogcycle status --fail-on-stale      # exit 1 if any series has stopped advancing
hogcycle status --json               # one object per series; the stale-series issue reads it
hogcycle revisions --indicator sow_inventory
hogcycle published --indicator sow_inventory --by 2024-03-15   # what was public that day
hogcycle export                      # gold → frontend/src/data/wall.json
hogcycle export --as-of 2026-01-01   # the wall as this warehouse knew it (cuts on fetched_at)

cd backend && pytest -q && ruff check .

# frontend
cd frontend && npm run dev
npm run build                        # static export → out/
```

## Decisions on record

`docs/adr/` — read these before changing architecture; they carry the reasons
so you do not have to re-derive them.

| | |
|---|---|
| 0001 | Bitemporal storage: why history is never overwritten |
| 0002 | Medallion layers and bronze immutability |
| 0003 | akshare behind a single adapter; the pure/impure split |
| 0004 | Daily sources are a 1-year rolling window |
| 0005 | 农业农村部 500县 as an independent second caliber |
| 0006 | Frontend stack: Next.js + TypeScript + ECharts |
| 0007 | Contract-first frontend/backend separation |
| 0008 | Granularity is a property of the row |
| 0009 | DuckDB is the engine, parquet is the record |
| 0010 | dbt confined to gold (deferred) |
| 0011 | Equities live outside the causal wall |
| 0012 | The overlay normalises rather than adding an axis |
| 0013 | 能繁母猪存栏 moves to the primary source; staleness is a failure |
| 0014 | Two prerendered languages; names travel in the contract |
| 0015 | A known outage is acknowledged with a deadline; the page still says so |
| 0016 | Three pages per language; panels share a crosshair by time, not by index |
| 0017 | The day a value became public is recorded, because that is what a backtest needs |
| 0018 | Weekly prices come from the ministry's own reports; calibers get explicit bounds |
| 0019 | The overview answers one question; the instrument panel is gone |
| 0020 | Every series has its own page; its description travels in the contract |
| 0021 | USDA's estimates of China come in; a forecast is a kind of indicator |
| 0022 | Each source is collected from where it answers; GitHub watches all of them |
| 0023 | A collector that stops is a failure within days, judged from what it fetched |
| 0024 | The contract carries a version, and every export is validated against the schema |
| 0025 | The page can stand on any past day, and shows only what was knowable then |
| 0026 | Breaks in a series are drawn where they happen: cadence changes from gold, caliber lineage from config |
| 0027 | A new series from a release already collected is read from the bronze it left |
| 0028 | A failure says which kind it is (transient, blocked, structure), and every run leaves a record |
| 0029 | What fails a run (a duplicate key), what warns (sources that part), and which sources must agree |
| 0030 | Year-to-date totals are stored as printed; a quarter is a difference gold takes |
| 0031 | The release calendar: an expectation read off past releases, never a date |
| 0032 | A payload that changed shape says how (names gone, names new) before it is parsed |
