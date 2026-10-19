"""When a series' next release is due, read off its own past releases.

docs/adr/0031. Staleness asks whether a series has stopped: its limit is
generous by design, 100 days for a monthly print, because a quiet month is
not a dead source. That leaves a reader waiting for the next 能繁母猪 figure
with nothing to go on between "fine" and "stopped". The releases already
held answer the question in between. Each dated value says how long after
its period it came out, so the next period's value is usually out by its end
plus the median of those lags, and is later than any on record once its end
plus the longest has passed.

That is an expectation, never a date. Nothing here is written anywhere but
the contract; `published_on` stays what the publisher printed, and is never
filled from a period plus a typical lag. "Overdue" is a fact with a fixed
definition, like a streak, and says nothing about why.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry.periods import month_end

# Fewer dated releases than this say too little about a rhythm to set an
# expectation from; the series gets none rather than a guess.
MIN_RELEASES = 6

_STEP_DAYS = {"daily": 1, "weekly": 7}


def next_period_end(d: dt.date, granularity: str) -> dt.date | None:
    """The end of the period after the one ending `d`, at the same cadence."""
    if granularity in _STEP_DAYS:
        return d + dt.timedelta(days=_STEP_DAYS[granularity])
    months = {"monthly": 1, "quarterly": 3, "annual": 12}.get(granularity)
    if months is None:
        return None
    total = d.year * 12 + d.month - 1 + months
    return month_end(total // 12, total % 12 + 1)


def next_release(rows: list[dict[str, Any]], *, today: dt.date) -> dict[str, Any] | None:
    """The next period, when its value is usually out, the day after which it
    would be later than any release on record, and whether that day has
    passed. None when the latest value is undated, the series is daily, or
    fewer than MIN_RELEASES values carry a release date."""
    values = [r for r in rows if r["value"] is not None]
    if not values or values[-1].get("published_on") is None:
        return None
    latest = values[-1]
    if latest["granularity"] == "daily":
        return None
    lags = sorted(
        (r["published_on"] - r["obs_date"]).days
        for r in values
        if r.get("published_on") is not None
    )
    if len(lags) < MIN_RELEASES:
        return None
    period = next_period_end(latest["obs_date"], latest["granularity"])
    if period is None:
        return None
    mid = len(lags) // 2
    median = lags[mid] if len(lags) % 2 else (lags[mid - 1] + lags[mid]) // 2
    usual = period + dt.timedelta(days=median)
    latest_by = period + dt.timedelta(days=lags[-1])
    return {
        "period": period.isoformat(),
        "usual": usual.isoformat(),
        "by": latest_by.isoformat(),
        "overdue": today > latest_by,
    }
