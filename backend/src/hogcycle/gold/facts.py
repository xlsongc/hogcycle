"""Facts about a reading that are worth putting in front of a reader.

The overview page has to say what matters without calling the cycle's phase,
and the way to do both is to state facts whose definitions need no judgment:

    extreme         the latest value is the lowest (or highest) the series has
                    been for at least a year, and since when
    threshold_run   how many consecutive observations sit on the current side
                    of a domain threshold such as the 5:1 breakeven, and since
                    when
    change          the latest reading against the one before it, of the same
                    granularity
    streak          how many readings in a row, back from the latest, moved the
                    same way, and from when
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


def _same_granularity(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    values = [r for r in rows if r["value"] is not None]
    if not values:
        return []
    g = values[-1]["granularity"]
    return [r for r in values if r["granularity"] == g]


def change(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Percent change from the previous reading of the latest one's
    granularity, and that reading's date. Same-granularity for the reason
    streak() gives; the date is carried because "previous" can be a week, a
    quarter, or — across an unpublished quarter — two."""
    same = _same_granularity(rows)
    if len(same) < 2 or not same[-2]["value"]:
        return None
    prev, last = same[-2], same[-1]
    return {
        "pct": round((last["value"] / prev["value"] - 1) * 100, 1),
        "since": prev["obs_date"].isoformat(),
    }


def streak(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The run of consecutive moves in one direction ending at the latest
    reading, counted among readings of the latest one's granularity.

    Granularity matters because 能繁母猪存栏 mixes quarter-end survey figures
    with extrapolated months: a quarterly reading compared against the month
    before it is a change of measurement, not a move. A run is reported from
    two moves up — one move is just the latest change, which the reader
    already sees — and ends at the first flat or opposite move. `n` counts
    readings held, so a quarter that was never published (2025年2季度) does
    not break a run; `since` lets the reader see the span it covers.
    """
    same = _same_granularity(rows)

    def sign(a: dict[str, Any], b: dict[str, Any]) -> int:
        d = b["value"] - a["value"]
        return (d > 0) - (d < 0)

    if len(same) < 3 or (direction := sign(same[-2], same[-1])) == 0:
        return None
    n, since = 0, same[-1]["obs_date"]
    for a, b in zip(reversed(same[:-1]), reversed(same[1:]), strict=True):
        if sign(a, b) != direction:
            break
        n, since = n + 1, a["obs_date"]
    if n < 2:
        return None
    return {"dir": "up" if direction > 0 else "down", "n": n, "since": since.isoformat()}


def first_seen_date(fetched: dt.datetime | None) -> str | None:
    """Transaction time as a date in UTC, the timezone `fetched_at` is kept in."""
    return None if fetched is None else fetched.astimezone(dt.UTC).date().isoformat()
