# 9. DuckDB is the engine, parquet is the record

Date: 2026-09-06 · Status: Accepted

## Context

"Use DuckDB as the database" admits two readings, with very different
consequences. DuckDB was already present as a *query engine* over parquet
files; the alternative is a persistent `.duckdb` file as the store.

The deciding constraint is that the daily `git commit` of `data/` **is** the
audit trail — the collect workflow says so explicitly, and warns against
force-pushing the branch.

|  | parquet, append-only | single `.duckdb` file |
|---|---|---|
| a day with no change | 0 bytes | whole database rewritten |
| a year of daily commits | incremental | ~365 full binary copies |
| diffable | yes, new files | no, opaque blob |
| concurrency | no lock | single-writer |

## Decision

Parquet is the system of record. DuckDB is the compute engine: cross-layer
queries, the definition language for gold, and the executor behind the
contract export. Derived artefacts (`data/gold/`, any `*.duckdb`) are
gitignored.

## Consequences

- The audit-trail mechanism survives, which decides the whole question.
- gold gets real SQL instead of pandas glue.
- Queries go through **one** view definition rather than ad-hoc
  `read_parquet` globs scattered across methods. That view sets
  `hive_partitioning := false`: files already carry an `indicator` column and
  the directory layout repeats it as `indicator=…`, so with hive partitioning
  on, one name resolved to two sources.
- Directory partitions stay for human navigation, not for the reader.
- No indexes or constraints. At this data size, irrelevant.
- DuckDB rejects prepared parameters in `CREATE VIEW`, so the glob is inlined
  and escaped.
