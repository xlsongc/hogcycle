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

TIER_ORDER = ("capacity", "margin", "price", "noise")

# Reference lines that mean something in the domain, not chart decoration.
THRESHOLDS: dict[str, dict[str, Any]] = {
    "hog_corn_ratio": {"value": 5.0, "label": "5:1 盈亏线"},
}

_G = {"daily": "D", "weekly": "W", "monthly": "M", "quarterly": "Q", "annual": "A"}


def percentile(values: list[float], target: float) -> int | None:
    """Where `target` sits in the series' own history, 0-100."""
    xs = sorted(v for v in values if v is not None)
    if len(xs) < 2:
        return None
    below = sum(1 for v in xs if v < target)
    return round(100 * below / (len(xs) - 1))


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

        points = [
            {
                "d": r["obs_date"].isoformat(),
                "v": r["value"],
                "g": _G.get(r["granularity"], "?"),
            }
            for r in rows
        ]
        panels.append(
            {
                "id": spec.id,
                "name": spec.name_zh,
                "tier": spec.tier,
                "unit": spec.unit,
                "freq": spec.freq,
                "revises": spec.revises,
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
