"""The data contract. Everything in the warehouse is an Observation.

Two independent time axes — this is the whole point of the project:

    obs_date    valid time        the date the value *describes*
    fetched_at  transaction time  the moment we *learned* it

Keeping both means you can ask "what did the data look like on 2026-03-01?"
and get the answer you would have had that day, not today's revised numbers.
Without it every backtest silently cheats.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import asdict, dataclass
from typing import Any

import pyarrow as pa

SILVER_SCHEMA = pa.schema(
    [
        pa.field("indicator", pa.string(), nullable=False),
        pa.field("obs_date", pa.date32(), nullable=False),
        pa.field("value", pa.float64(), nullable=True),
        pa.field("unit", pa.string(), nullable=False),
        pa.field("source", pa.string(), nullable=False),
        pa.field("snapshot_id", pa.string(), nullable=False),
        pa.field("fetched_at", pa.timestamp("us", tz="UTC"), nullable=False),
    ]
)


@dataclass(frozen=True, slots=True)
class Observation:
    indicator: str
    obs_date: dt.date
    value: float | None
    unit: str
    source: str
    snapshot_id: str
    fetched_at: dt.datetime

    def __post_init__(self) -> None:
        if self.fetched_at.tzinfo is None:
            raise ValueError(f"{self.indicator}: fetched_at must be tz-aware")
        if self.obs_date > dt.date.today() + dt.timedelta(days=1):
            raise ValueError(
                f"{self.indicator}: obs_date {self.obs_date} is in the future"
            )

    def as_row(self) -> dict[str, Any]:
        return asdict(self)


class ValidationError(Exception):
    """Raised to abort a whole batch. Never partially load."""


def validate(
    obs: list[Observation], *, unit: str, lo: float, hi: float
) -> list[Observation]:
    """Reject a batch outright rather than let bad rows into silver.

    Range bounds live in sources.yaml, not here, and are deliberately wide.
    The job is to catch a unit change or an upstream parser break — 元/公斤
    silently becoming 元/500克 — not to second-guess the market.
    """
    if not obs:
        raise ValidationError("empty batch — upstream returned nothing")

    bad_unit = {o.unit for o in obs} - {unit}
    if bad_unit:
        raise ValidationError(f"unit drift: expected {unit!r}, saw {bad_unit}")

    outliers = [o for o in obs if o.value is not None and not lo <= o.value <= hi]
    if outliers:
        raise ValidationError(
            f"{len(outliers)} value(s) outside [{lo}, {hi}] — likely a unit or "
            f"parser change upstream. e.g. {[(o.obs_date, o.value) for o in outliers[:3]]}"
        )

    seen: set[dt.date] = set()
    for o in obs:
        if o.obs_date in seen:
            raise ValidationError(f"duplicate obs_date {o.obs_date} within one batch")
        seen.add(o.obs_date)

    return obs
