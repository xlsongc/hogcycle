# 10. dbt confined to gold

Date: 2026-09-06 · Status: Proposed / Deferred

## Context

dbt is the most-requested tool in data-engineering job listings, and this
project is partly a portfolio piece, so the signal is a stated requirement
rather than vanity. `dbt-duckdb` supports parquet sources and external
parquet materialisation, so it would not force a `.duckdb` store (see 0009).

Against that: gold is 6-12 models, where `ref()` dependency resolution earns
little; ingestion is Python and cannot move; and the result is two mental
models in one solo repo.

## Decision

Deferred, not rejected. When adopted, dbt covers **silver → gold only**.

Explicitly out of scope, permanently:

- collection, bronze, and silver writes
- **dbt snapshots for the bitemporal layer.** Snapshots are SCD Type 2 and
  look like the right tool, but they materialise into a database (0009 rules
  that out) and their change detection is coarser than `append_changes`,
  which compares values with a float tolerance. The existing implementation
  is correct and tested; do not trade it for a framework feature.
- `as_of()`, which stays in Python — it is parameterised by a moment, which is
  not what a dbt model is.

## Consequences

- Phase 1 writes gold as plain SQL executed from Python. Migration later is
  close to mechanical while the model count is small.
- Adoption is early-or-never: easy at 6 models, a migration project at 20.
- If the two-tool overhead proves annoying, falling back to SQL files plus a
  runner costs only the generated lineage docs.
