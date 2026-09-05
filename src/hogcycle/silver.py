"""Silver: append-only, bitemporal. No row is ever updated in place.

A revision is a new row with a later fetched_at, sitting alongside the old
one. `as_of()` then reconstructs the state of knowledge at any past moment,
which is what makes "would this signal have called the turn in time?" an
answerable question instead of a hindsight story.

Storage stays small because `append_changes` only writes rows whose value
actually moved. A daily job on an unrevised series costs nothing.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from .schema import SILVER_SCHEMA, Observation


class SilverStore:
    def __init__(self, root: Path | str = "data/silver") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def _glob(self) -> str:
        return str(self.root / "**" / "*.parquet")

    def _has_data(self) -> bool:
        return any(self.root.rglob("*.parquet"))

    def append_changes(self, obs: list[Observation]) -> list[Observation]:
        """Write only the observations that are new or genuinely revised.

        Returns the rows actually written, so the caller can log a real
        changelog instead of "job succeeded" every morning.
        """
        if not obs:
            return []

        indicator = obs[0].indicator
        known = self.as_of(dt.datetime.now(dt.timezone.utc), indicator=indicator)
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
        # intraday revisions are real and we keep both.
        seq = len(list(part.glob("*.parquet")))
        table = pa.Table.from_pylist([o.as_row() for o in changed], schema=SILVER_SCHEMA)
        pq.write_table(table, part / f"part-{seq:03d}.parquet", compression="zstd")
        return changed

    def as_of(
        self, moment: dt.datetime, *, indicator: str | None = None
    ) -> dict[dt.date, float | None]:
        """State of knowledge at `moment`: newest value per obs_date, ignoring
        anything learned later."""
        if not self._has_data():
            return {}

        sql = """
            SELECT obs_date, value FROM (
                SELECT obs_date, value,
                       ROW_NUMBER() OVER (
                           PARTITION BY indicator, obs_date
                           ORDER BY fetched_at DESC
                       ) AS rn
                FROM read_parquet($glob, hive_partitioning := true)
                WHERE fetched_at <= $moment
                  AND ($indicator IS NULL OR indicator = $indicator)
            ) WHERE rn = 1
        """
        rows = duckdb.execute(
            sql, {"glob": self._glob, "moment": moment, "indicator": indicator}
        ).fetchall()
        return {r[0]: r[1] for r in rows}

    def revisions(self, indicator: str) -> list[tuple[dt.date, dt.datetime, float | None]]:
        """Every obs_date that was ever restated, with its full trail.

        For 能繁母猪 this is the interesting table in the whole warehouse:
        it shows how much the number moves after the fact, which bounds how
        much you can trust the freshest print.
        """
        if not self._has_data():
            return []
        sql = """
            WITH t AS (
                SELECT obs_date, fetched_at, value
                FROM read_parquet($glob, hive_partitioning := true)
                WHERE indicator = $indicator
            )
            SELECT obs_date, fetched_at, value FROM t
            WHERE obs_date IN (SELECT obs_date FROM t GROUP BY obs_date HAVING count(*) > 1)
            ORDER BY obs_date, fetched_at
        """
        return duckdb.execute(sql, {"glob": self._glob, "indicator": indicator}).fetchall()


def _same(a: float | None, b: float | None) -> bool:
    if a is None or b is None:
        return a is b
    return abs(a - b) < 1e-9
