# 8. Granularity is a property of the row

Date: 2026-09-05 · Status: Accepted

## Context

`futures_hog_supply(symbol=生猪产能)` returns a wide table whose 周期 column
mixes three period shapes in a single series:

    2009 … 2024            annual
    2025年一季度（末）        quarter end   国家统计局
    2025年7月                month end     农业农村部 定点监测 extrapolation

The inherited adapter guessed the date and value columns from a global
candidate list, matched 周期, then failed on both the value column and
`_to_date('2009')`. The result: the single most important indicator in the
project silently failed to collect on every run.

## Decision

The period parser returns `(date, granularity)`. `granularity` is a column on
`Observation` and on `SILVER_SCHEMA`. Column names come from `extract` in
config; the defaults are akshare's actual `date`/`value` convention, not a
fuzzy guess. Every label resolves to the **end** of its period.

## Consequences

- Annual and monthly readings can coexist in one series without pretending to
  be the same kind of measurement. The frontend renders them differently
  (hollow vs filled markers).
- For this series granularity *also* encodes caliber, so no separate `caliber`
  field was added — one field, and a note in `sources.yaml` explaining the
  coincidence. Revisit if a second series needs the distinction.
- Two labels can legitimately map to one date (2025年三季度（末）and a
  hypothetical 2025年9月 both land on 09-30). That aborts the batch rather
  than picking one arbitrarily.
- Exact duplicate rows are collapsed instead — 行情宝 emits four of them, and
  taking an 11-year series offline over upstream noise would be worse.
- Adding an indicator is still a config change. Only wide tables need
  `extract`; the other six entries do not have it.
