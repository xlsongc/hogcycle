"""Facts about a reading that are worth putting in front of a reader.

The overview page has to say what matters without calling the cycle's phase,
and the way to do both is to state facts whose definitions need no judgment:

    extreme         the latest value is the lowest (or highest) the series has
                    been for at least a year, and since when
    threshold_run   how many consecutive observations sit on the current side
                    of a domain threshold such as the 5:1 breakeven, and since
                    when
    first_seen      when this warehouse first learned the latest observation —
                    transaction time, read straight off the bitemporal store

Each is a derivation over the series, so it lives here rather than in the
frontend: the contract is the boundary, and the page renders numbers rather
than working them out. None of them says what the numbers mean.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

# A low is only worth stating if it is a low on a scale longer than the
# seasonal swing. Under a year, "lowest since March" describes the calendar
# rather than the cycle.
EXTREME_MIN_SPAN_DAYS = 365


def extreme(
    rows: list[dict[str, Any]], latest: dict[str, Any], *, min_history: int
) -> dict[str, Any] | None:
    """Whether the latest value is an extreme over at least a year.

    `since` is the date of the most recent earlier observation at least as
    extreme, or the first observation in the window when there is none
    (`all` is then true: nothing in the record is lower, or higher). A series
    shorter than `min_history` gets nothing, for the same reason it gets no
    percentile: a short series has no distribution to be extreme in.

    The comparison is over what the series holds. 能繁母猪存栏 is annual
    before 2021, so a monthly low inside 2019 is not in the record and cannot
    be "since" anything.
    """
    value, at = latest["value"], latest["obs_date"]
    prior = [r for r in rows if r["value"] is not None and r["obs_date"] < at]
    if value is None or len(prior) + 1 < min_history:
        return None

    for kind, as_extreme in (
        ("low", lambda x: x <= value),
        ("high", lambda x: x >= value),
    ):
        last = next((r for r in reversed(prior) if as_extreme(r["value"])), None)
        since = prior[0]["obs_date"] if last is None else last["obs_date"]
        if (at - since).days >= EXTREME_MIN_SPAN_DAYS:
            return {"kind": kind, "since": since.isoformat(), "all": last is None}
    return None


def threshold_run(
    rows: list[dict[str, Any]], threshold: float
) -> dict[str, Any] | None:
    """The run of consecutive observations on the latest value's side of the
    threshold. A value exactly on the line counts as above it: the 5:1 line is
    breakeven, and breakeven is not a loss."""
    values = [r for r in rows if r["value"] is not None]
    if not values:
        return None
    below = values[-1]["value"] < threshold
    n, since = 0, values[-1]["obs_date"]
    for r in reversed(values):
        if (r["value"] < threshold) != below:
            break
        n, since = n + 1, r["obs_date"]
    return {"side": "below" if below else "above", "since": since.isoformat(), "n": n}


def first_seen_date(fetched: dt.datetime | None) -> str | None:
    """Transaction time as a date in UTC, the timezone `fetched_at` is kept in."""
    return None if fetched is None else fetched.astimezone(dt.UTC).date().isoformat()
