"""Which rows make up a series as gold shows it, in one place.

The wall, the per-series CSVs and the revision trail all have to agree on
what a series is: its caliber bounds, whether it is derived, and which of a
mirror's rows are copies of a primary reading. Resolving that in each caller
would let a downloaded file disagree with the chart beside it.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry.spec import IndicatorSpec, Registry
from ..storage.silver import SilverStore
from .derived import DERIVED

TIER_ORDER = ("capacity", "margin", "price", "noise", "equity", "market")

_DERIVED = {d.spec.id: d for d in DERIVED}


def all_specs(registry: Registry) -> list[IndicatorSpec]:
    """Collected and derived series, ordered along the causal chain. A derived
    series sits in its tier like any other: the wall is ordered by what a
    series does, not by where it came from."""
    return sorted(
        [*registry, *(d.spec for d in DERIVED)],
        key=lambda s: TIER_ORDER.index(s.tier) if s.tier in TIER_ORDER else 99,
    )


def is_derived(spec: IndicatorSpec) -> bool:
    return spec.id in _DERIVED


def rows_of(
    spec: IndicatorSpec,
    silver: SilverStore,
    *,
    moment: dt.datetime,
    start: dt.date | None = None,
) -> list[dict[str, Any]]:
    """The series as known at `moment`, inside its caliber, from `start`."""
    raw = (
        _DERIVED[spec.id].rows(silver, moment)
        if spec.id in _DERIVED
        else silver.series(spec.id, moment=moment)
    )
    return drop_misdated_copies(
        [
            r
            for r in raw
            if spec.covers(r["obs_date"]) and (start is None or r["obs_date"] >= start)
        ]
    )


def first_seen_of(
    spec: IndicatorSpec, silver: SilverStore, obs_date: dt.date, *, moment: dt.datetime
) -> dt.datetime | None:
    if spec.id in _DERIVED:
        return _DERIVED[spec.id].first_seen(silver, obs_date, moment=moment)
    return silver.first_seen(spec.id, obs_date, moment=moment)


# How close a mirror's undated row may sit to a dated primary row of the same
# value and still be the same observation filed under another day.
_SAME_READING_DAYS = {
    "daily": 0,
    "weekly": 6,
    "monthly": 20,
    "quarterly": 45,
    "annual": 180,
}


def drop_misdated_copies(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Leave out a mirror's copy of a primary reading that it filed under
    another date.

    When a series moved from a mirror to its primary source, silver keeps
    both histories. Where the two agree on the date, the primary's dated row
    simply supersedes. Where the mirror shifted the date — 玄田 put the
    500-county 2月第3周 仔猪 price under 2026-02-19, the ministry's collection
    day was 02-24 — the same number would be drawn twice. An undated row is
    left out only when a dated row of the identical value sits within a
    period of it: an undated row with no such twin is a real fill, like the
    2025年2季度末 sow figure the primary's 202506 edition shipped without.
    Silver still holds the row; this is what the wall shows, not a deletion.
    """
    dated = [r for r in rows if r.get("published_on") is not None]
    if not dated:
        return rows

    def is_copy(r: dict[str, Any]) -> bool:
        if r.get("published_on") is not None or r["value"] is None:
            return False
        window = _SAME_READING_DAYS.get(r["granularity"], 0)
        return any(
            d["value"] == r["value"]
            and 0 < abs((d["obs_date"] - r["obs_date"]).days) <= window
            for d in dated
        )

    return [r for r in rows if not is_copy(r)]
