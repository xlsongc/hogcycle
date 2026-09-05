"""Silver: append-only, bitemporal. No row is ever updated in place.

A revision is a new row with a later fetched_at, sitting alongside the old
one. `as_of()` then reconstructs the state of knowledge at any past moment,
which is what makes "would this signal have called the turn in time?" an
answerable question instead of a hindsight story.

Storage stays small because `append_changes` only writes rows whose value
actually moved. A daily job on an unrevised series costs nothing.

DuckDB is the query engine here, never the system of record. The record is
the parquet files: append-only, one small file per (indicator, fetch date),
which is what makes a daily `git commit` of data/ a real audit trail instead
of a fresh binary blob every morning.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from ..contracts.schema import SILVER_SCHEMA, Observation

_COLUMNS = ", ".join(f.name for f in SILVER_SCHEMA)

# hive_partitioning is deliberately OFF. The parquet files already carry an
# `indicator` column, and the directory layout repeats it as `indicator=...`;
# with hive partitioning on, one name resolves to two sources. The directories
# stay for human navigation and cheap file-level selection, not for the reader.
_VIEW = """
CREATE OR REPLACE VIEW silver AS
SELECT {columns}
FROM read_parquet('{glob}', hive_partitioning := false, union_by_name := true)
"""


def _sql_literal(path: str) -> str:
    """DuckDB rejects prepared parameters inside CREATE VIEW, so the glob is
    inlined. It comes from our own configuration rather than user input, but
    escaping it keeps that from mattering if the root ever becomes dynamic."""
    return path.replace("'", "''")


class SilverStore:
    def __init__(self, root: Path | str = "data/silver") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def _glob(self) -> str:
        return str(self.root / "**" / "*.parquet")

    def _has_data(self) -> bool:
        return any(self.root.rglob("*.parquet"))

    def _connect(self) -> duckdb.DuckDBPyConnection:
        con = duckdb.connect()
        con.execute(_VIEW.format(columns=_COLUMNS, glob=_sql_literal(self._glob)))
        return con

    def query(self, sql: str, params: dict[str, Any] | None = None) -> list[tuple]:
        """Run SQL against the `silver` view. Returns [] when there is no data
        yet, so callers never special-case a cold start."""
        if not self._has_data():
            return []
        with self._connect() as con:
            return con.execute(sql, params or {}).fetchall()

    # ---------- writes ----------

    def append_changes(self, obs: list[Observation]) -> list[Observation]:
        """Write only the observations that are new or genuinely revised.

        Returns the rows actually written, so the caller can log a real
        changelog instead of "job succeeded" every morning.
        """
        if not obs:
            return []

        indicator = obs[0].indicator
        known = self.as_of(dt.datetime.now(dt.UTC), indicator=indicator)
        changed = [
            o
            for o in obs
            if o.obs_date not in known or not _same(known[o.obs_date], o.value)
        ]
        if not changed:
            return []

        fetched_date = changed[0].fetched_at.date().isoformat()
        part = self.root / f"indicator={indicator}" / f"fetched_date={fetched_date}"
        part.mkdir(parents=True, exist_ok=True)

        # A second run on the same day is a separate file, not an overwrite —
        # intraday revisions are real and we keep both. Numbering from the
        # highest existing sequence (not the count) so a gap can never cause
        # an append to land on top of an earlier part.
        existing = [int(p.stem.split("-")[-1]) for p in part.glob("part-*.parquet")]
        seq = max(existing, default=-1) + 1
        table = pa.Table.from_pylist([o.as_row() for o in changed], schema=SILVER_SCHEMA)
        pq.write_table(table, part / f"part-{seq:03d}.parquet", compression="zstd")
        return changed

    # ---------- reads ----------

    def as_of(
        self, moment: dt.datetime, *, indicator: str
    ) -> dict[dt.date, float | None]:
        """State of knowledge about one indicator at `moment`: the newest value
        per obs_date, ignoring anything learned later.

        `indicator` is required. Keying several series by obs_date alone would
        let two indicators that share a date silently overwrite each other.
        """
        rows = self.query(
            """
            SELECT obs_date, value FROM (
                SELECT obs_date, value,
                       ROW_NUMBER() OVER (
                           PARTITION BY obs_date ORDER BY fetched_at DESC
                       ) AS rn
                FROM silver
                WHERE indicator = $indicator AND fetched_at <= $moment
            ) WHERE rn = 1
            """,
            {"moment": moment, "indicator": indicator},
        )
        return {r[0]: r[1] for r in rows}

    def series(
        self, indicator: str, *, moment: dt.datetime | None = None
    ) -> list[dict[str, Any]]:
        """The indicator's time series as known at `moment` (default: now),
        ordered by obs_date, with each row's granularity preserved."""
        moment = moment or dt.datetime.now(dt.UTC)
        rows = self.query(
            """
            SELECT obs_date, value, granularity, unit FROM (
                SELECT obs_date, value, granularity, unit,
                       ROW_NUMBER() OVER (
                           PARTITION BY obs_date ORDER BY fetched_at DESC
                       ) AS rn
                FROM silver
                WHERE indicator = $indicator AND fetched_at <= $moment
            ) WHERE rn = 1
            ORDER BY obs_date
            """,
            {"indicator": indicator, "moment": moment},
        )
        return [
            {"obs_date": r[0], "value": r[1], "granularity": r[2], "unit": r[3]}
            for r in rows
        ]

    def coverage(self) -> list[dict[str, Any]]:
        """One row per indicator: how much we hold and how fresh it is."""
        rows = self.query(
            """
            SELECT indicator, count(DISTINCT obs_date), min(obs_date),
                   max(obs_date), max(fetched_at)
            FROM silver GROUP BY indicator ORDER BY indicator
            """
        )
        return [
            {"indicator": r[0], "n": r[1], "first": r[2], "latest": r[3], "fetched": r[4]}
            for r in rows
        ]

    def revisions(self, indicator: str) -> list[tuple[dt.date, dt.datetime, float | None]]:
        """Every obs_date that was ever restated, with its full trail.

        For 能繁母猪 this is the interesting table in the whole warehouse: it
        shows how much the number moves after the fact, which bounds how much
        you can trust the freshest print.
        """
        return self.query(
            """
            WITH t AS (
                SELECT obs_date, fetched_at, value FROM silver
                WHERE indicator = $indicator
            )
            SELECT obs_date, fetched_at, value FROM t
            WHERE obs_date IN (
                SELECT obs_date FROM t GROUP BY obs_date HAVING count(*) > 1
            )
            ORDER BY obs_date, fetched_at
            """,
            {"indicator": indicator},
        )


def _same(a: float | None, b: float | None) -> bool:
    if a is None or b is None:
        return a is b
    return abs(a - b) < 1e-9
