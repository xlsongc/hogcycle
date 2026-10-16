"""Where a series changes how often it is read, and which caliber it continues.

docs/adr/0026. Both are facts the chart draws at the date they happen, so a
reader meets them at the seam rather than in a footnote.

A cadence is classed by the gap to the previous reading, not by the row's
granularity label: the chart should show what the readings are. A cadence
counts once it holds for three consecutive gaps, and a break is a change
between two that count, so one missed month or a New Year closure is a gap,
which the chart already dashes, and not a change of cadence.
"""

from __future__ import annotations

import datetime as dt
from itertools import pairwise
from typing import Any

from ..registry.spec import IndicatorSpec, Registry

# Upper bound in days of the gap each cadence allows.
_CLASSES = (("D", 3), ("W", 10), ("M", 45), ("Q", 135))

# Consecutive gaps a cadence must hold to count as settled. Three is the
# fewest that keeps 能繁母猪's quarterly-only run since 2025-10 and drops the
# two missed 行情宝 weeks in 2026-04.
HOLD = 3


def cadence(gap_days: int) -> str:
    return next((c for c, limit in _CLASSES if gap_days <= limit), "A")


def cadence_breaks(dates: list[dt.date]) -> list[dict[str, str]]:
    """Each date where one settled cadence gives way to another: the reading
    the new run starts from, the class before and after, and the reading that
    settled it. Until that last reading was known, nobody could tell a new
    cadence from a gap, so a page standing on an earlier day does not draw
    the break (docs/adr/0025).

    A cadence is settled once it holds for HOLD consecutive gaps, and only a
    change between two settled cadences is a break. Irregular stretches, like
    玄田's 2018-2019 gilt prices, settle nothing, and a few missed weeks in a
    weekly series (行情宝, 2026-04) are gaps the chart dashes, not a new
    cadence.
    """
    classes = [cadence((b - a).days) for a, b in pairwise(dates)]
    breaks: list[dict[str, str]] = []
    current: str | None = None
    for i, c in enumerate(classes):
        if c == current or classes[i : i + HOLD] != [c] * HOLD:
            continue
        if current is not None:
            breaks.append({
                "d": dates[i].isoformat(),
                "from": current,
                "to": c,
                "settled": dates[i + HOLD].isoformat(),
            })
        current = c
    return breaks


def caliber_of(spec: IndicatorSpec, registry: Registry) -> dict[str, Any] | None:
    """The caliber's bounds and its neighbours, or None when it has neither.
    `later` is found by looking for the spec that names this one."""
    later = next((s.id for s in registry if s.continues == spec.id), None)
    if not (spec.caliber_from or spec.caliber_until or spec.continues or later):
        return None
    return {
        "from": None if spec.caliber_from is None else spec.caliber_from.isoformat(),
        "until": None if spec.caliber_until is None else spec.caliber_until.isoformat(),
        "earlier": spec.continues,
        "later": later,
    }
