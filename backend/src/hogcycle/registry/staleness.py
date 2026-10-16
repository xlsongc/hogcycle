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

The opposite failure is real too. A guard that stays red every day for a
cause everyone already knows hides the next cause nobody knows yet. When a
person has seen the freeze and owns the fix, `upstream_dark` in config says
so with a deadline: the series is still reported as stale on every run and on
the site, but it stops failing the run until `review_by`, and then it fails
again without anyone having to remember.
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


# How far ahead of `review_by` an acknowledgement starts saying it will lapse,
# and the nearer warning after that. An acknowledgement that lapses unseen
# turns the run red on a day nobody planned for; two weeks is enough to
# build the fix, renew with a reason, or retire the series. Nothing renews or
# retires itself.
LAPSE_WARN_DAYS = 14
LAPSE_LAST_DAYS = 3


@dataclass(frozen=True, slots=True)
class Staleness:
    indicator: str
    latest: dt.date | None
    age_days: int | None
    limit: int
    # The fact: the series has not advanced within its limit. Never softened by
    # an acknowledgement — the site shows a stale reading as stale regardless.
    stale: bool
    retired: bool = False
    # A person owns this freeze until `review_by`. Only ever True when stale.
    acknowledged: bool = False
    review_by: dt.date | None = None
    # Days left before an acknowledgement lapses; None when there is none.
    lapses_in: int | None = None

    @property
    def lapsing(self) -> bool:
        """Acknowledged, and within LAPSE_WARN_DAYS of no longer being."""
        return self.lapses_in is not None and self.lapses_in <= LAPSE_WARN_DAYS

    @property
    def failing(self) -> bool:
        """Whether this should turn the run red."""
        return self.stale and not self.acknowledged

    @property
    def lapsed(self) -> bool:
        """Still frozen past the date someone promised to look again."""
        return self.stale and self.review_by is not None and not self.acknowledged

    @property
    def resumed(self) -> bool:
        """Advancing again while config still says it is dark. Not a failure,
        but the acknowledgement would mask the next freeze until it lapses,
        so it should be removed."""
        return not self.stale and self.review_by is not None and self.latest is not None

    @property
    def note(self) -> str:
        if self.retired:
            return "retired"
        if self.latest is None:
            return "no data"
        if self.acknowledged:
            soon = f", lapses in {self.lapses_in}d" if self.lapsing else ""
            return f"dark {self.age_days}d, ack until {self.review_by}{soon}"
        if self.lapsed:
            return f"STALE {self.age_days}d > {self.limit}d, ack lapsed {self.review_by}"
        if self.stale:
            return f"STALE {self.age_days}d > {self.limit}d"
        if self.resumed:
            return f"{self.age_days}d, still marked dark"
        if self.age_days is not None and self.age_days < 0:
            # Only a forecast reaches past today; say what it reaches to.
            return f"forecast to {self.latest}"
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
    stale = age > limit
    dark = spec.upstream_dark
    acknowledged = stale and dark is not None and today <= dark.review_by
    return Staleness(
        spec.id,
        latest,
        age,
        limit,
        stale=stale,
        acknowledged=acknowledged,
        review_by=None if dark is None else dark.review_by,
        lapses_in=(dark.review_by - today).days if acknowledged and dark else None,
    )


def check_all(
    registry: Registry,
    latest_by_indicator: dict[str, dt.date],
    *,
    today: dt.date | None = None,
) -> list[Staleness]:
    return [
        check(spec, latest_by_indicator.get(spec.id), today=today) for spec in registry
    ]
