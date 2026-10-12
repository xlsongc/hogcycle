"""The data contract. Everything in the warehouse is an Observation.

Two independent time axes — this is the whole point of the project:

    obs_date    valid time        the date the value *describes*
    fetched_at  transaction time  the moment we *learned* it

Keeping both means you can ask "what did the data look like on 2026-03-01?"
and get the answer you would have had that day, not today's revised numbers.
Without it every backtest silently cheats.

`published_on` is the day the *publisher* released the value, when the
source says so. It is a third time, and the one a backtest needs:
fetched_at says when this warehouse knew, published_on says when anyone
could have. The two part ways on every backfilled row — a
2022年3月 print loaded in 2026 has a 2026 fetched_at and a 2022
published_on — and only published_on can answer "what was knowable on
2024-06-01?" for a date before collection began. A 农业农村部 monthly print
appears three to nine weeks after its period ends, so a backtest that treats
obs_date as the day it was known looks ahead by that much. NULL means the
source does not say; it is never guessed.

Another field, `granularity`, records *how wide a period the value covers*.
It is a property of the row, not of the indicator: 能繁母猪存栏 arrives as
annual figures for 2009-2024, quarter-end figures for 2025 quarters, and
monthly figures in between — all in one column. Flattening those into one
smooth line would silently claim they are equivalent measurements. They are
not, and for that series granularity also happens to encode the caliber
(quarter-end = 国家统计局; other months = 农业农村部 定点监测 extrapolation).
"""

from __future__ import annotations

import datetime as dt
from dataclasses import asdict, dataclass
from typing import Any, Literal

import pyarrow as pa

Granularity = Literal["daily", "weekly", "monthly", "quarterly", "annual"]

GRANULARITIES: tuple[str, ...] = ("daily", "weekly", "monthly", "quarterly", "annual")

SILVER_SCHEMA = pa.schema(
    [
        pa.field("indicator", pa.string(), nullable=False),
        pa.field("obs_date", pa.date32(), nullable=False),
        pa.field("value", pa.float64(), nullable=True),
        pa.field("unit", pa.string(), nullable=False),
        pa.field("granularity", pa.string(), nullable=False),
        pa.field("source", pa.string(), nullable=False),
        pa.field("snapshot_id", pa.string(), nullable=False),
        pa.field("fetched_at", pa.timestamp("us", tz="UTC"), nullable=False),
        pa.field("published_on", pa.date32(), nullable=True),
    ]
)


@dataclass(frozen=True, slots=True)
class Observation:
    indicator: str
    obs_date: dt.date
    value: float | None
    unit: str
    granularity: str
    source: str
    snapshot_id: str
    fetched_at: dt.datetime
    published_on: dt.date | None = None

    def __post_init__(self) -> None:
        if self.fetched_at.tzinfo is None:
            raise ValueError(f"{self.indicator}: fetched_at must be tz-aware")
        if self.granularity not in GRANULARITIES:
            raise ValueError(
                f"{self.indicator}: unknown granularity {self.granularity!r}; "
                f"expected one of {GRANULARITIES}"
            )
        # Compare against UTC "today" — fetched_at is UTC, so a local date here
        # would make the guard drift by a day depending on where this runs.
        today = dt.datetime.now(dt.UTC).date()
        if self.obs_date > today + dt.timedelta(days=1):
            raise ValueError(
                f"{self.indicator}: obs_date {self.obs_date} is in the future"
            )
        # A period cannot be reported before it has ended. Seeing this means
        # the period parser or the publication-date parser is wrong, and
        # either would hand a backtest a value from the future.
        if self.published_on is not None and self.published_on < self.obs_date:
            raise ValueError(
                f"{self.indicator}: published {self.published_on}, before the "
                f"period it reports ends ({self.obs_date})"
            )

    def as_row(self) -> dict[str, Any]:
        return asdict(self)
