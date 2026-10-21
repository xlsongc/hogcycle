"""The futures market's record: what each 大商所 live-hog contract priced its
delivery month at, months ahead, against where it finished (docs/adr/0036).

The overview shows the curve, the market's price for each coming month. A
reader deciding how far to lean on it should know how far off such prices
have been. Sina serves every contract's whole life back to LH2109, so silver
holds the curve as it stood on each trading day, and this is arithmetic on
that: no model, and no forecast of ours.

For each delivered contract: the settle in force 1, 3, 6 and 9 months
before its delivery month began, against its last settle. The last settle
is the market's own end point, in the same caliber (CNY per tonne of the
delivery grade), so nothing here is set against a spot price.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterable
from typing import Any

from ..registry.spec import Registry
from ..storage.silver import SilverStore

ADAPTER = "futures_curve"
HORIZONS = (1, 3, 6, 9)

Path = list[tuple[dt.date, float]]


def paths(prints: Iterable[dict[str, Any]], *, moment: dt.datetime) -> dict[dt.date, Path]:
    """Each contract's settles by trading day, as learned by `moment`, keyed
    by its delivery month's end. A day read twice keeps its latest reading."""
    by_day: dict[dt.date, dict[dt.date, tuple[dt.datetime, float]]] = {}
    for r in prints:
        if r["published_on"] is None or r["value"] is None or r["fetched_at"] > moment:
            continue
        days = by_day.setdefault(r["obs_date"], {})
        held = days.get(r["published_on"])
        if held is None or r["fetched_at"] >= held[0]:
            days[r["published_on"]] = (r["fetched_at"], r["value"])
    return {
        delivery: sorted((day, v) for day, (_, v) in days.items())
        for delivery, days in sorted(by_day.items())
    }


def settle_on(path: Path, day: dt.date) -> tuple[dt.date, float] | None:
    """The settle in force on `day`, if the contract was listed by then.

    The last one printed on or before it. silver writes a settle only when
    it moves, so a quiet stretch has no rows and the last print still
    stands; a day before the first print is a contract not yet listed."""
    held = [(d, v) for d, v in path if d <= day]
    if not held or day > path[-1][0]:
        return None
    return held[-1]


def months_before(delivery: dt.date, n: int) -> dt.date:
    """The first day of the month `n` months before the delivery month."""
    total = delivery.year * 12 + delivery.month - 1 - n
    return dt.date(total // 12, total % 12 + 1, 1)


def delivered(delivery: dt.date, path: Path, today: dt.date) -> bool:
    """Whether a contract has finished: its delivery month is over and its
    prints reach the month before it. One whose prints stop earlier has no
    end point to judge against. (A settle unchanged into the delivery month
    writes no row, which is why the month before counts.)"""
    return bool(path) and delivery < today and path[-1][0] >= months_before(delivery, 1)


def _pct(v: float, final: float) -> float:
    return round(100 * (v / final - 1), 1)


def record(contracts: dict[dt.date, Path], today: dt.date) -> dict[str, Any]:
    """Per delivered contract, what it priced at each horizon against its
    last settle, and per horizon, how far off those prices were."""
    rows = []
    for delivery, path in contracts.items():
        if not delivered(delivery, path, today):
            continue
        final_on, final = path[-1]
        # Only the horizons it was listed for: a contract lists about a year
        # ahead, so nine months out is sometimes before its first day.
        ahead = []
        for h in HORIZONS:
            seen = settle_on(path, months_before(delivery, h))
            if seen is not None:
                ahead.append(
                    {"months": h, "d": seen[0].isoformat(), "v": seen[1],
                     "err_pct": _pct(seen[1], final)}
                )
        rows.append(
            {
                "delivery": delivery.isoformat(),
                "final": final,
                "final_on": final_on.isoformat(),
                "ahead": ahead,
            }
        )

    horizons = []
    for h in HORIZONS:
        errs = [
            (r["delivery"], a["err_pct"])
            for r in rows
            for a in r["ahead"]
            if a["months"] == h
        ]
        if not errs:
            continue
        worst = max(errs, key=lambda e: abs(e[1]))
        horizons.append(
            {
                "months": h,
                "n": len(errs),
                "mean_abs_pct": round(sum(abs(e) for _, e in errs) / len(errs), 1),
                "mean_pct": round(sum(e for _, e in errs) / len(errs), 1),
                "worst_pct": worst[1],
                "worst_delivery": worst[0],
            }
        )
    return {"horizons": horizons, "deliveries": rows}


def weekly(path: Path) -> list[dict[str, float | str]]:
    """The last settle of each ISO week: a contract's life is a year of
    trading days, and a week apart is what a chart of thirty of them needs.
    silver keeps every day."""
    by_week: dict[tuple[int, int], tuple[dt.date, float]] = {}
    for d, v in path:
        y, w, _ = d.isocalendar()
        by_week[(y, w)] = (d, v)
    return [{"d": d.isoformat(), "v": v} for d, v in (by_week[k] for k in sorted(by_week))]


def build_market(
    registry: Registry, silver: SilverStore, *, moment: dt.datetime
) -> dict[str, Any] | None:
    """The curve's history and the market's record, for the contract. None
    when no futures curve is configured or none is held."""
    spec = next((s for s in registry if s.adapter == ADAPTER), None)
    if spec is None:
        return None
    contracts = paths(silver.prints(spec.id), moment=moment)
    if not contracts:
        return None
    today = moment.date()
    return {
        "series": spec.id,
        "history": [
            {
                "delivery": delivery.isoformat(),
                "delivered": delivered(delivery, path, today),
                "settles": weekly(path),
            }
            for delivery, path in contracts.items()
            if path
        ],
        "track_record": record(contracts, today),
    }
