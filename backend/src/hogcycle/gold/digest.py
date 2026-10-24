"""The week in one page: what moved, what came out, what is due next.

docs/adr/0039. A reader who looks once a week, and a newsletter that would
send once a week, need the difference between two Sundays, not the wall.
Each week here is that difference between two snapshots: every series as it
could be known at the end of the week, and as it could be known at the end
of the week before, by the rule the as-of page uses (gold/vintage.py). So a
past week reads as it stood then. A value revised later does not rewrite
it, and a series this warehouse had not yet learned is absent rather than
filled in from today.

Arithmetic only: the latest reading against the one a week earlier, the
week's high and low, a release against the period before it. Nothing here
says what a move means.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry.spec import IndicatorSpec, Registry
from ..storage.silver import SilverStore
from .calendar import next_release
from .market import ADAPTER as CURVE_ADAPTER
from .series import all_specs, is_derived, rows_of
from .vintage import Periods, in_force, periods
from .wall import year_on_year

# Series read every week: their move is the news. A slower one is news when
# a new period of it comes out.
FAST = frozenset({"daily", "weekly"})

# A contract with no settle this long before the cut has stopped trading.
# silver writes a settle only when it moves, and the October holiday closes
# the exchange for a week, so a few days of silence is not enough to say so.
LISTED_WITHIN_DAYS = 14

DAY = dt.timedelta(days=1)
WEEK = dt.timedelta(days=7)

Rows = list[dict[str, Any]]


def week_id(monday: dt.date) -> str:
    """ISO year and week, `2026-W43`: the name a week goes by in both
    languages, and its address."""
    year, week, _ = monday.isocalendar()
    return f"{year}-W{week:02d}"


def week_starts(first_learned: dt.date, today: dt.date) -> list[dt.date]:
    """The Monday of every week from the first one after collection began to
    the current one. The week collection began has no earlier snapshot to be
    set against: everything in it would read as new."""
    start = first_learned - dt.timedelta(days=first_learned.weekday()) + WEEK
    out = []
    while start <= today:
        out.append(start)
        start += WEEK
    return out


def _latest(rows: Rows) -> dict[str, Any] | None:
    return next((r for r in reversed(rows) if r["value"] is not None), None)


def _pct(a: float, b: float) -> float | None:
    # As facts.change: a share of a quantity at or below zero says nothing.
    if a <= 0 or b <= 0:
        return None
    return round((b / a - 1) * 100, 1)


def move(spec_id: str, now: Rows, before: Rows, start: dt.date) -> dict[str, Any] | None:
    """The latest reading at the cut against the latest a week earlier. The
    same date on both sides means nothing new came out; the page says so
    rather than printing a change of zero. High and low are over the days of
    this week a daily series holds."""
    last = _latest(now)
    if last is None:
        return None
    prev = _latest(before)
    days = [
        r["value"]
        for r in now
        if r["value"] is not None and r["granularity"] == "daily" and r["obs_date"] >= start
    ]
    return {
        "id": spec_id,
        "d": last["obs_date"].isoformat(),
        "v": last["value"],
        "prev_d": None if prev is None else prev["obs_date"].isoformat(),
        "prev_v": None if prev is None else prev["value"],
        "delta": None if prev is None else round(last["value"] - prev["value"], 4),
        "pct": None if prev is None else _pct(prev["value"], last["value"]),
        "hi": max(days) if len(days) > 1 else None,
        "lo": min(days) if len(days) > 1 else None,
    }


def releases(spec_id: str, now: Rows, before: Rows) -> list[dict[str, Any]]:
    """Periods that came out during the week, and periods whose value changed.

    A new period is one past the latest held a week earlier. A period filled
    in behind that edge is history arriving late (a backfill), not news, and
    is left out. A series first knowable this week counts only its latest
    period, or a backfill would list ten years of months."""
    held = {r["obs_date"]: r["value"] for r in before if r["value"] is not None}
    edge = max(held, default=None)
    values = [r for r in now if r["value"] is not None]
    out = []
    for i, r in enumerate(values):
        old = held.get(r["obs_date"])
        if old is None:
            if edge is None and i != len(values) - 1:
                continue
            if edge is not None and r["obs_date"] < edge:
                continue
        elif old == r["value"]:
            continue
        # The period before, at the same cadence: 能繁母猪 mixes quarter-end
        # survey figures with months, and one against the other is a change
        # of measurement (facts.change).
        prior = next(
            (p for p in reversed(values[:i]) if p["granularity"] == r["granularity"]),
            None,
        )
        out.append(
            {
                "id": spec_id,
                "d": r["obs_date"].isoformat(),
                "v": r["value"],
                "granularity": r["granularity"],
                "on": (
                    r["published_on"]
                    if r["published_on"] is not None
                    else r["fetched_at"].astimezone(dt.UTC).date()
                ).isoformat(),
                "basis": r["basis"],
                "prior_d": None if prior is None else prior["obs_date"].isoformat(),
                "prior_v": None if prior is None else prior["value"],
                "pct": None if prior is None else _pct(prior["value"], r["value"]),
                "yoy": year_on_year(values[: i + 1], r),
                "revised_from": old,
            }
        )
    return out


def curve(now: Rows, before: Rows, cut: dt.date) -> list[dict[str, Any]]:
    """Each listed contract's settle at the cut against its settle a week
    earlier, nearest delivery first. A contract whose delivery month is over,
    or that has stopped printing, is left out: its last settle is history, on
    the futures page."""
    held = {r["obs_date"]: r["value"] for r in before if r["value"] is not None}
    out = []
    for r in now:
        on = r["published_on"]
        if r["value"] is None or on is None or r["obs_date"] < cut:
            continue
        if (cut - on).days > LISTED_WITHIN_DAYS:
            continue
        old = held.get(r["obs_date"])
        out.append(
            {
                "delivery": r["obs_date"].isoformat(),
                "v": r["value"],
                "on": on.isoformat(),
                "prev_v": old,
                "delta": None if old is None else round(r["value"] - old, 4),
                "pct": None if old is None else _pct(old, r["value"]),
            }
        )
    return out


def due(spec_id: str, rows: Rows, cut: dt.date) -> dict[str, Any] | None:
    """A release expected within seven days of the cut, or already overdue:
    the release calendar's own expectation (docs/adr/0031), never a date."""
    nxt = next_release(rows, today=cut)
    if nxt is None:
        return None
    if not nxt["overdue"] and dt.date.fromisoformat(nxt["usual"]) > cut + WEEK:
        return None
    # The calendar steps at the latest reading's cadence, which for 能繁母猪
    # is the quarter, not the series' declared month.
    latest = _latest(rows)
    return {"id": spec_id, "granularity": latest and latest["granularity"], **nxt}


def _held(spec: IndicatorSpec, silver: SilverStore, moment: dt.datetime) -> Periods:
    """Every print of a series learned by `moment`. A derived series has no
    prints of its own: its rows as computed now, each dated by its inputs,
    stand in, so a later revision of an input does show in a past week of it.
    """
    if is_derived(spec):
        return periods(spec, rows_of(spec, silver, moment=moment))
    return periods(spec, [r for r in silver.prints(spec.id) if r["fetched_at"] <= moment])


def build_weeks(
    registry: Registry, silver: SilverStore, *, moment: dt.datetime
) -> list[dict[str, Any]]:
    """Every week from the first after collection began to the current one,
    oldest first. The current week stands on the day of the export and says
    it is not over."""
    specs = [s for s in all_specs(registry) if not s.retired and not s.ytd]
    held = {s.id: _held(s, silver, moment) for s in specs}
    learned = [
        r["fetched_at"] for ps in held.values() for prints in ps.values() for r in prints
    ]
    if not learned:
        return []
    today = moment.astimezone(dt.UTC).date()
    first = min(learned).astimezone(dt.UTC).date()

    cache: dict[tuple[str, dt.date], Rows] = {}

    def at(spec: IndicatorSpec, day: dt.date) -> Rows:
        key = (spec.id, day)
        if key not in cache:
            cache[key] = in_force(held[spec.id], day)
        return cache[key]

    weeks = []
    for start in week_starts(first, today):
        end = start + 6 * DAY
        cut = min(end, today)
        before = start - DAY
        moves, released, upcoming, contracts = [], [], [], []
        for s in specs:
            now, then = at(s, cut), at(s, before)
            if s.adapter == CURVE_ADAPTER:
                contracts = curve(now, then, cut)
            elif s.freq in FAST and not s.forecast:
                if (m := move(s.id, now, then, start)) is not None:
                    moves.append(m)
            else:
                released += releases(s.id, now, then)
                if not s.forecast and (d := due(s.id, now, cut)) is not None:
                    upcoming.append(d)
        weeks.append(
            {
                "id": week_id(start),
                "start": start.isoformat(),
                "end": end.isoformat(),
                "cut": cut.isoformat(),
                "complete": today > end,
                "moves": moves,
                "released": sorted(released, key=lambda r: (r["on"], r["id"])),
                "curve": contracts,
                "upcoming": sorted(upcoming, key=lambda u: (u["usual"], u["id"])),
            }
        )
    return weeks
