"""What could be known on a given day, and when each undated value was learned.

docs/adr/0025. For each period, take every print of it:

1. if any print carries a release date, only dated prints count, and the one
   in force on a day is the latest released on or before it. A publisher's
   own record outranks a mirror's undated copy of it: 玄田's mistyped 25.36
   for the 2023-10-25 piglet price, learned in 2026, must not displace the
   ministry's 25.63, released 2023-10-30;
2. otherwise the print in force is the latest this warehouse had learned by
   then, which is all an undated source lets anyone say.

A release date is never inferred. An undated value learned on 2026-09-06 was
not knowable on 2024-03-15 as far as this warehouse can show, however soon
the publisher probably put it out.

The page applies the same rule to the contract (frontend lib/asOf.ts); this
module applies it to silver, for `hogcycle published` and for the learned
dates the contract carries.
"""

from __future__ import annotations

import datetime as dt
from collections import Counter
from typing import Any

from ..registry.spec import IndicatorSpec
from ..storage.silver import SilverStore
from .series import drop_misdated_copies


def learned_on(row: dict[str, Any]) -> str:
    """The UTC day this warehouse learned a row, as the contract writes it."""
    return row["fetched_at"].astimezone(dt.UTC).date().isoformat()


def stamp_learned(points: list[dict[str, Any]]) -> str | None:
    """Turn each undated point's `_l` into the panel's default learned day plus
    an `l` only where a point differs from it.

    Nearly every undated point was learned on the day its series was first
    backfilled, so one date per panel says it, and only forward-collected
    days need their own. A date on every point would have cost ~100 KB of a
    ~340 KB contract; this costs ~2 KB. Returns the default, or None when no
    point is undated.
    """
    days = [p["_l"] for p in points if "_l" in p]
    if not days:
        return None
    counts = Counter(days)
    # Ties go to the earlier day, so the default does not depend on order.
    default = min(counts, key=lambda d: (-counts[d], d))
    for p in points:
        day = p.pop("_l", None)
        if day is not None and day != default:
            p["l"] = day
    return default


Periods = dict[dt.date, list[dict[str, Any]]]


def periods(spec: IndicatorSpec, prints: list[dict[str, Any]]) -> Periods:
    """Every print inside the caliber, grouped by the period it describes."""
    by_period: Periods = {}
    for r in prints:
        if spec.covers(r["obs_date"]):
            by_period.setdefault(r["obs_date"], []).append(r)
    return by_period


def knowable_on(
    spec: IndicatorSpec, silver: SilverStore, day: dt.date
) -> list[dict[str, Any]]:
    """The series as it could be known on `day`: one row per period, the print
    in force then, with `basis` saying which clock placed it ("published" or
    "learned"). Inside the caliber; a mirror's misdated copy of a dated
    reading is left out, as on the wall."""
    return in_force(periods(spec, silver.prints(spec.id)), day)


def in_force(by_period: Periods, day: dt.date) -> list[dict[str, Any]]:
    """`knowable_on` over prints already grouped, so a caller asking about
    many days reads silver once."""
    out: list[dict[str, Any]] = []
    for obs_date in sorted(by_period):
        rows = by_period[obs_date]
        dated = [r for r in rows if r["published_on"] is not None]
        if dated:
            known = [r for r in dated if r["published_on"] <= day]
            pick = max(
                known, key=lambda r: (r["published_on"], r["fetched_at"]), default=None
            )
            basis = "published"
        else:
            known = [r for r in rows if r["fetched_at"].astimezone(dt.UTC).date() <= day]
            pick = max(known, key=lambda r: r["fetched_at"], default=None)
            basis = "learned"
        if pick is not None:
            out.append({**pick, "basis": basis})
    return drop_misdated_copies(out)
