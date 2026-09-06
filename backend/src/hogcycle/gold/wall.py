"""Gold: derived series for the chart wall.

This layer computes. It does **not** judge. There is no rule here that emits
"we are in the deleveraging phase" — with roughly three cycles of usable
history, any such rule would be fitted to its own sample and would look
authoritative while being noise. Phase-calling stays with the reader, and the
layer's job is to put every series on one time axis with the derived context
a reader needs: units reconciled, history deep enough to see the cycle, and
each point's granularity preserved.

Ordering follows the causal chain the project's tier system encodes —
capacity leads price by 10-12 months; margin decides whether a capacity move
persists — so reading the wall top to bottom reads cause before effect.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry.spec import Registry
from ..storage.silver import SilverStore

TIER_ORDER = ("capacity", "margin", "price", "noise", "equity")

# The causal wall shows the physical cycle. A share price is a claim on that
# cycle rather than a link in it, so equities stay out of the wall by default
# and live in the overlay, where the question they answer — does the market
# lead or lag 能繁母猪 — is one an overlay can actually put to the reader.
WALL_TIERS = frozenset({"capacity", "margin", "price", "noise"})

# Reference lines that mean something in the domain, not chart decoration.
THRESHOLDS: dict[str, dict[str, Any]] = {
    "hog_corn_ratio": {"value": 5.0, "label": "5:1 盈亏线"},
}

_G = {"daily": "D", "weekly": "W", "monthly": "M", "quarterly": "Q", "annual": "A"}


# Above this, a daily series is thinned to one point per ISO week. Two
# reasons, and both are real: over a 11.7-year window daily stock noise says
# nothing about where the cycle sits, and six daily equity series would add
# ~500 KB to a contract that a static page loads in full. silver keeps every
# day — thinning is a presentation choice, so it belongs here and nowhere
# upstream of here.
DOWNSAMPLE_ABOVE = 1000


def _downsample(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(points) <= DOWNSAMPLE_ABOVE:
        return points
    by_week: dict[tuple[int, int], dict[str, Any]] = {}
    for p in points:
        y, w, _ = dt.date.fromisoformat(p["d"]).isocalendar()
        by_week[(y, w)] = p  # last observation of the week wins
    return [by_week[k] for k in sorted(by_week)]


# A percentile is a claim about a distribution, and a short series has not got
# one. 屠宰量 starts in 2025-07 with 13 monthly points, all inside a single
# year: "历史第 42 分位" over that would read as cycle context while actually
# describing last winter. Two years is the shortest span that can contain a
# full seasonal turn, so below it the tile shows the level and says nothing
# about position.
MIN_HISTORY_FOR_PERCENTILE = 24


def percentile(values: list[float], target: float) -> int | None:
    """Where `target` sits in the series' own history, 0-100, or None when the
    series is too short for that to mean anything."""
    xs = sorted(v for v in values if v is not None)
    if len(xs) < MIN_HISTORY_FOR_PERCENTILE:
        return None
    below = sum(1 for v in xs if v < target)
    # Callers here always pass a value drawn from `xs`, which caps `below` at
    # n-1. The clamp is for anyone who does not: a percentile of 104 is not a
    # rounding artefact to explain away, it is a number that cannot exist.
    return min(100, round(100 * below / (len(xs) - 1)))


def build_wall(
    registry: Registry,
    silver: SilverStore,
    *,
    start: dt.date | None = None,
    moment: dt.datetime | None = None,
) -> dict[str, Any]:
    """Assemble the full contract payload the frontend consumes.

    `moment` reconstructs the wall as it would have looked on a past date —
    the bitemporal store's whole reason for existing, reachable from the
    dashboard rather than only from a notebook.
    """
    moment = moment or dt.datetime.now(dt.UTC)
    specs = sorted(
        registry,
        key=lambda s: (TIER_ORDER.index(s.tier) if s.tier in TIER_ORDER else 99,),
    )

    panels: list[dict[str, Any]] = []
    readings: list[dict[str, Any]] = []

    for spec in specs:
        rows = silver.series(spec.id, moment=moment)
        if start:
            rows = [r for r in rows if r["obs_date"] >= start]
        if not rows:
            continue

        points = _downsample(
            [
                {
                    "d": r["obs_date"].isoformat(),
                    "v": r["value"],
                    "g": _G.get(r["granularity"], "?"),
                }
                for r in rows
            ]
        )
        # A retired caliber is history, not a current reading. It stays
        # available in the overlay — comparing 规模以上 against 全口径 屠宰量
        # is a legitimate thing to want — but it is kept off the wall, whose
        # tiles are read as "where we are now".
        in_wall = spec.tier in WALL_TIERS and not spec.retired
        panels.append(
            {
                "id": spec.id,
                "name": spec.name_zh,
                "tier": spec.tier,
                "unit": spec.unit,
                "freq": spec.freq,
                "revises": spec.revises,
                "in_wall": in_wall,
                "threshold": THRESHOLDS.get(spec.id),
                "points": points,
            }
        )

        values = [r["value"] for r in rows if r["value"] is not None]
        if values:
            latest = rows[-1]
            readings.append(
                {
                    "id": spec.id,
                    "name": spec.name_zh,
                    "tier": spec.tier,
                    "in_wall": in_wall,
                    "unit": spec.unit,
                    "value": latest["value"],
                    "obs_date": latest["obs_date"].isoformat(),
                    "granularity": latest["granularity"],
                    "percentile": percentile(values, latest["value"])
                    if latest["value"] is not None
                    else None,
                    "n": len(rows),
                }
            )

    return {
        "generated_at": moment.isoformat(),
        "window": {
            "start": (start.isoformat() if start else None),
            "end": max((p["points"][-1]["d"] for p in panels), default=None),
        },
        "panels": panels,
        "readings": readings,
    }
