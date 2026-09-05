# CLAUDE.md

Operating rules for working in this repo. Not a README — it says how to work
here, not what the project is for. For that, see `README.md`; for *why* things
are the way they are, see `docs/adr/`.

## What this project actually is

**A warehouse that remembers what it used to believe.**

能繁母猪存栏 (breeding sow inventory) is the only real leading indicator in
the China hog cycle — biology fixes a 10-12 month lag from sow to slaughter —
and it is also the only series upstream restates after the fact. Those two
facts holding at once is the entire reason for bitemporal storage. Without it
you cannot answer "would this signal have called the turn using only what was
knowable at the time?", because your history table has silently absorbed
revisions and every backtest cheats.

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
- **Every adapter needs a real payload fixture.** All five inherited tests
  passed while the two most important indicators could not be collected at
  all, because every test fed itself a synthetic `date`/`value` frame.
  Fixtures are captured from bronze; see `backend/tests/fixtures/`.
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
- Errors name what they saw. `no value column 能繁母猪存栏 in ['周期', ...]`
  beats `KeyError`.

## Commands

```bash
# backend (from repo root, with .venv active)
hogcycle collect                     # all indicators; one failure does not abort the rest
hogcycle status                      # coverage and latest obs_date per series
hogcycle revisions --indicator sow_inventory
hogcycle export                      # gold → frontend/src/data/wall.json
hogcycle export --as-of 2026-01-01   # rebuild the wall as it stood that day

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
