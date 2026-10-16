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

# Columns the schema gained after files were already written. Parquet files are
# never rewritten, so an old file simply lacks the column; `union_by_name`
# fills it with NULL as long as *some* file has it, and this fills it when
# none does yet. NULL is the honest reading either way — those rows were
# written before anyone recorded the fact.
_ADDED_LATER = {"published_on": "DATE"}

# hive_partitioning is deliberately OFF. The parquet files already carry an
# `indicator` column, and the directory layout repeats it as `indicator=...`;
# with hive partitioning on, one name resolves to two sources. The directories
# stay for human navigation and cheap file-level selection, not for the reader.
_SOURCE = "read_parquet('{glob}', hive_partitioning := false, union_by_name := true)"

# Which row is "the" value for an obs_date: the latest we learned, and among
# rows learned at once — a backfill reads every edition in one run — the
# latest the publisher released. NULLS LAST so a dated print outranks an
# undated row of the same fetch, and DESC puts the winner first.
_LATEST = "ORDER BY fetched_at DESC, published_on DESC NULLS LAST"


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
        source = _SOURCE.format(glob=_sql_literal(self._glob))
        described = con.execute(f"DESCRIBE SELECT * FROM {source}").fetchall()
        present = {r[0] for r in described}
        columns = ", ".join(
            f.name if f.name in present
            else f"CAST(NULL AS {_ADDED_LATER[f.name]}) AS {f.name}"
            for f in SILVER_SCHEMA
        )
        con.execute(f"CREATE OR REPLACE VIEW silver AS SELECT {columns} FROM {source}")
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

        A dated print is recorded once per release. Re-reading an edition
        writes nothing, and neither does a later edition repeating a value
        unchanged, because the earliest release is the one that made it
        knowable. A value we already hold but had no release date for *is*
        written again with its date: the number has not moved, but when it
        became public is something we did not know before.
        """
        if not obs:
            return []

        indicator = obs[0].indicator
        current = self._current(indicator)
        printed = self._prints(indicator)
        # Judged one row at a time against what is held *including* the rows
        # already accepted from this batch, in release order, so a batch that
        # carries a period's first release and a reprint of it — a replay
        # across several bronze snapshots does — keeps only the first.
        changed: list[Observation] = []
        for o in sorted(obs, key=lambda o: (o.obs_date, o.published_on or dt.date.min)):
            if not _is_news(o, current.get(o.obs_date), printed):
                continue
            changed.append(o)
            current[o.obs_date] = (o.value, o.published_on)
            if o.published_on is not None:
                printed[(o.obs_date, o.published_on)] = o.value
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

    def _current(
        self, indicator: str
    ) -> dict[dt.date, tuple[float | None, dt.date | None]]:
        rows = self.query(
            f"""
            SELECT obs_date, value, published_on FROM (
                SELECT obs_date, value, published_on,
                       ROW_NUMBER() OVER (PARTITION BY obs_date {_LATEST}) AS rn
                FROM silver WHERE indicator = $indicator
            ) WHERE rn = 1
            """,
            {"indicator": indicator},
        )
        return {r[0]: (r[1], r[2]) for r in rows}

    def _prints(self, indicator: str) -> dict[tuple[dt.date, dt.date], float | None]:
        """Every dated release recorded, latest reading of each."""
        rows = self.query(
            """
            SELECT obs_date, published_on, value FROM (
                SELECT obs_date, published_on, value,
                       ROW_NUMBER() OVER (
                           PARTITION BY obs_date, published_on ORDER BY fetched_at DESC
                       ) AS rn
                FROM silver
                WHERE indicator = $indicator AND published_on IS NOT NULL
            ) WHERE rn = 1
            """,
            {"indicator": indicator},
        )
        return {(r[0], r[1]): r[2] for r in rows}

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
            f"""
            SELECT obs_date, value FROM (
                SELECT obs_date, value,
                       ROW_NUMBER() OVER (PARTITION BY obs_date {_LATEST}) AS rn
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
        ordered by obs_date, with each row's granularity, release date, and
        when this warehouse learned it."""
        moment = moment or dt.datetime.now(dt.UTC)
        rows = self.query(
            f"""
            SELECT obs_date, value, granularity, unit, published_on, fetched_at FROM (
                SELECT obs_date, value, granularity, unit, published_on, fetched_at,
                       ROW_NUMBER() OVER (PARTITION BY obs_date {_LATEST}) AS rn
                FROM silver
                WHERE indicator = $indicator AND fetched_at <= $moment
            ) WHERE rn = 1
            ORDER BY obs_date
            """,
            {"indicator": indicator, "moment": moment},
        )
        return [
            {
                "obs_date": r[0],
                "value": r[1],
                "granularity": r[2],
                "unit": r[3],
                "published_on": r[4],
                "fetched_at": r[5],
            }
            for r in rows
        ]

    def prints(self, indicator: str) -> list[dict[str, Any]]:
        """Every row ever written for the indicator, oldest first: each value
        with its release date and when it was learned. The raw material for
        asking what was knowable on a day (gold/vintage.py)."""
        rows = self.query(
            """
            SELECT obs_date, value, granularity, published_on, fetched_at FROM silver
            WHERE indicator = $indicator
            ORDER BY obs_date, fetched_at
            """,
            {"indicator": indicator},
        )
        return [
            {
                "obs_date": r[0],
                "value": r[1],
                "granularity": r[2],
                "published_on": r[3],
                "fetched_at": r[4],
            }
            for r in rows
        ]

    def published(
        self, indicator: str, *, by: dt.date, moment: dt.datetime | None = None
    ) -> list[dict[str, Any]]:
        """The series as anyone could have known it on `by`: for each period,
        the latest release on or before that day, out of what this warehouse
        holds at `moment` (default: now).

        This is the backtest's view and the reason published_on exists. It
        reaches back before collection began, because a release date is a
        fact about the release rather than about when we read it. Periods
        whose source does not date its releases are absent, not guessed —
        `series()` still has them.
        """
        moment = moment or dt.datetime.now(dt.UTC)
        rows = self.query(
            """
            SELECT obs_date, value, granularity, unit, published_on FROM (
                SELECT obs_date, value, granularity, unit, published_on,
                       ROW_NUMBER() OVER (
                           PARTITION BY obs_date
                           ORDER BY published_on DESC, fetched_at DESC
                       ) AS rn
                FROM silver
                WHERE indicator = $indicator AND fetched_at <= $moment
                  AND published_on IS NOT NULL AND published_on <= $by
            ) WHERE rn = 1
            ORDER BY obs_date
            """,
            {"indicator": indicator, "moment": moment, "by": by},
        )
        return [
            {
                "obs_date": r[0],
                "value": r[1],
                "granularity": r[2],
                "unit": r[3],
                "published_on": r[4],
            }
            for r in rows
        ]

    def first_seen(
        self, indicator: str, obs_date: dt.date, *, moment: dt.datetime
    ) -> dt.datetime | None:
        """When an observation was first learned, as known at `moment`.

        The earliest `fetched_at` for that obs_date, so a later revision does
        not make an old period look new. For a series loaded by backfill this
        is the backfill date, not the publisher's release date — transaction
        time records when *we* knew, which is all this store can vouch for.
        """
        rows = self.query(
            """
            SELECT min(fetched_at) FROM silver
            WHERE indicator = $indicator AND obs_date = $obs_date
              AND fetched_at <= $moment
            """,
            {"indicator": indicator, "obs_date": obs_date, "moment": moment},
        )
        return rows[0][0] if rows else None

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

    def revisions(
        self, indicator: str
    ) -> list[tuple[dt.date, dt.datetime, dt.date | None, float | None]]:
        """Every obs_date whose value was ever restated, with its full trail:
        (obs_date, fetched_at, published_on, value), oldest first.

        A restatement is a *value* that changed. A row that only added the
        release date to a value we already had is not one, so periods with a
        single distinct value are left out even when they have several rows.

        For 能繁母猪 this is the interesting table in the whole warehouse: it
        shows how much the number moves after the fact, which bounds how much
        you can trust the freshest print.
        """
        return self.query(
            """
            WITH t AS (
                SELECT obs_date, fetched_at, published_on, value FROM silver
                WHERE indicator = $indicator
            )
            SELECT obs_date, fetched_at, published_on, value FROM t
            WHERE obs_date IN (
                SELECT obs_date FROM t GROUP BY obs_date
                HAVING count(DISTINCT value) > 1
            )
            ORDER BY obs_date, published_on NULLS FIRST, fetched_at
            """,
            {"indicator": indicator},
        )


def _same(a: float | None, b: float | None) -> bool:
    if a is None or b is None:
        return a is b
    return abs(a - b) < 1e-9


def _is_news(
    o: Observation,
    current: tuple[float | None, dt.date | None] | None,
    printed: dict[tuple[dt.date, dt.date], float | None],
) -> bool:
    """Whether `o` tells silver something it does not already hold."""
    if current is None:
        return True
    value, published_on = current
    if o.published_on is None:
        return not _same(value, o.value)
    release = (o.obs_date, o.published_on)
    if release in printed:
        # The same release read again. Only a different reading of it — a
        # parser fix replayed from bronze — is news.
        return not _same(printed[release], o.value)
    if published_on is not None and o.published_on < published_on:
        # Older than the release held as current: judge it against the release
        # in force on its own day, not against a later revision. A payload
        # listing a reprint and a revision of one period otherwise wrote the
        # reprint the second time it was read (found by tests/test_properties).
        before = [p for (d, p) in printed if d == o.obs_date and p <= o.published_on]
        return not before or not _same(printed[(o.obs_date, max(before))], o.value)
    # A later release repeating the value adds nothing: the earliest one is
    # when it became knowable. An earlier one, or a first date for a value
    # held undated, does.
    dated_earlier = published_on is not None and published_on <= o.published_on
    return not (_same(value, o.value) and dated_earlier)
