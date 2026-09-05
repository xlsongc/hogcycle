# Phase 1 — the chart wall

Date: 2026-09-05 · Status: implemented

## What this phase delivers

A wall of aligned time-series panels covering the hog cycle's causal chain,
deep enough to see roughly three cycles, honest about where the data is thin.
It computes and aligns; it does not call the cycle's phase.

Scope was set by choosing **breadth before depth**, with bitemporal
verification deferred to a later phase — safe to defer because bronze runs
before normalise, so the revision evidence banks itself whether or not
anything reads it yet.

## Why breadth first, and what breadth means

Breadth is bounded by the causal chain, not by what akshare happens to expose:

| tier | question it answers | indicators |
|---|---|---|
| capacity | what will supply be in 10-12 months? | 能繁母猪存栏, 仔猪价格, 二元母猪价格 |
| margin | will the current capacity move persist? | 玉米价格, 猪粮比价 |
| price | what is the outcome now? | 生猪成交均价, 外三元, 白条肉, 肉类价格指数 |
| noise | short-run disturbance, not the cycle | 出栏均重 |

Ten indicators, nine upstream calls (成交均价 and 成交均重 share one).

## Deliverables

1. **Registry able to describe upstream as it is** — wide tables, Chinese
   period labels, mixed granularity. ADR-0008.
2. **Both broken indicators collecting.** sow_inventory (22 rows, 2009→2025,
   three granularities) and corn_price (unit corrected to 元/吨).
3. **Four indicators added** now that wide tables are expressible, including
   行情宝 at 11.7 years — the deepest hog-price series available free.
4. **gold → contract JSON**, validated against `contracts/wall.schema.json`.
5. **The wall**: Next.js + TypeScript + ECharts, static export.
6. **Real payload fixtures** and 41 tests.

## Architecture

```
akshare ─fetch─→ bronze (immutable, content-addressed)
                    │
                 normalise (pure)
                    │
                 validate  ── unit / range / granularity / duplicates
                    │
                 silver (append-only parquet, bitemporal)
                    │
                 gold (DuckDB compute, gitignored)
                    │
        contracts/wall.schema.json  ←── the only boundary
                    │
            frontend/src/data/wall.json
                    │
              Next.js static export
```

## Design decisions carried in from brainstorming

- **Small multiples, never dual-axis.** The indicators span 万头, 元/公斤,
  元/吨 and a bare ratio. Two y-scales on one plot would invent a correlation
  the data does not contain; separate panels on a shared time axis will not.
- **`echarts.connect()` for the shared crosshair.** One hover reads the whole
  causal chain down a vertical line — the feature the wall exists for.
- **Three tier hues plus grey.** A fourth categorical hue fails the palette
  validator's all-pairs gate in a small-multiples layout (checked: blue-orange-
  aqua-yellow, -violet and -red all fail in at least one mode). `noise` takes
  the de-emphasis grey, which also states the thesis.
- **Granularity is visible.** Coarser readings get hollow markers — secondary
  encoding, so the distinction never rests on colour.
- **Hover tolerance per granularity.** With daily series holding one year,
  snapping to the nearest observation would print a 2025 value beside everyone
  else's 2019. Out of tolerance reads 此期间无数据.
- **A table view twin.** Required as relief for the aqua hue's sub-3:1 contrast
  on the light surface, and it is the WCAG-clean path to every value.

## Verification

```
backend   41 tests passing, ruff clean
collect   10/10 indicators ok, 3,317 observations
rerun     0 rows written — change detection works
export    contract validates, 122.9 KB
frontend  tsc strict clean, static export builds
```

## Deliberately not in this phase

| | why |
|---|---|
| 农业农村部 500县 | ~520 archive pages to backfill and prose parsing; its cost structure is nothing like akshare's one-call-full-history. ADR-0005. |
| dbt | 6-12 models does not yet earn the second mental model. ADR-0010. |
| HTTP API | The wall is static. Removing `output: "export"` turns routes on later without a migration. |
| Automatic phase calling | Three cycles of history cannot support a rule that would not be fitted to its own sample. |
| 上市公司月度销售简报 | Announcement parsing; belongs with the 农业农村部 adapter work. |

## Known gaps

- `meat_price_index` stops at 2025-10-01 upstream; not a collection failure.
- 二元母猪价格 is irregular rather than strictly weekly; `freq` calls it weekly.
- ISO week vs 第N周 can differ by days at year boundaries. Within a weekly
  series' own resolution, but worth knowing.
- No revision has been observed yet — the trail can only fill going forward.
  `hogcycle revisions` says so rather than printing an empty table.
