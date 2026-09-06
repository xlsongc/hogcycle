"""Is a series still alive?

The failure this exists to catch has already happened once. `sow_inventory`
came from a third-party mirror that stopped updating in 2025年10月 and went on
serving its final 22 rows. Every daily run reported `ok, 0 rows` — which is
also exactly what a healthy series on a quiet day reports. Eleven months
passed before anyone noticed the leading indicator had frozen.

CLAUDE.md already says a silently empty collection is worse than a failed
one. This closes the gap that rule left open: a collection that succeeds, and
returns data, and is nonetheless dead. The signal is not the fetch, it is
whether `max(obs_date)` has moved when the series' own frequency says it
should have.

Thresholds are deliberately loose. The cost of a false alarm is a person
looking at a chart; the cost of a missed one is eleven months of blindness —
but an alarm that cries wolf every Chinese New Year gets muted, and a muted
alarm is worse than none. So each limit spans at least two publication cycles
plus the lag, and an indicator whose real cadence differs from its declared
`freq` overrides it with `max_age_days` in config rather than loosening the
default for everyone.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from .spec import IndicatorSpec, Registry

# Two publication cycles plus the observed lag, per granularity.
#   daily     markets close; 春节 shuts physical trade for up to two weeks
#   monthly   the 农业农村部 joint release for month M has appeared as late as
#             M+2 (2026年7月 was published 2026-08-27)
#   quarterly Q ends, prints ~20 days later, then nothing until Q+1 prints —
#             the latest obs_date legitimately ages past 110 days
DEFAULT_MAX_AGE_DAYS: dict[str, int] = {
    "daily": 21,
    "weekly": 30,
    "monthly": 100,
    "quarterly": 150,
    "annual": 500,
}


@dataclass(frozen=True, slots=True)
class Staleness:
    indicator: str
    latest: dt.date | None
    age_days: int | None
    limit: int
    stale: bool
    retired: bool = False

    @property
    def note(self) -> str:
        if self.retired:
            return "retired"
        if self.latest is None:
            return "no data"
        if self.stale:
            return f"STALE {self.age_days}d > {self.limit}d"
        return f"{self.age_days}d"


def limit_for(spec: IndicatorSpec) -> int:
    if spec.max_age_days is not None:
        return spec.max_age_days
    return DEFAULT_MAX_AGE_DAYS[spec.freq]


def check(
    spec: IndicatorSpec, latest: dt.date | None, *, today: dt.date | None = None
) -> Staleness:
    today = today or dt.datetime.now(dt.UTC).date()
    limit = limit_for(spec)
    if spec.retired:
        # Upstream closed this caliber. It is finished, not frozen — and the
        # distinction is the whole point of this module.
        age = None if latest is None else (today - latest).days
        return Staleness(spec.id, latest, age, limit, stale=False, retired=True)
    if latest is None:
        # Absence is reported, never called stale: a series that has never
        # collected is a different problem with a different fix.
        return Staleness(spec.id, None, None, limit, stale=False)
    age = (today - latest).days
    return Staleness(spec.id, latest, age, limit, stale=age > limit)


def check_all(
    registry: Registry,
    latest_by_indicator: dict[str, dt.date],
    *,
    today: dt.date | None = None,
) -> list[Staleness]:
    return [
        check(spec, latest_by_indicator.get(spec.id), today=today) for spec in registry
    ]
