"""`hogcycle published --indicator X --by DATE`: what could be known that day.

The backtest's question, asked of silver directly. It follows the same rule
the page applies to the contract (docs/adr/0025): a dated print counts from
its release, an undated one only from when this warehouse learned it, and
nothing is placed by an assumed lag.
"""

from __future__ import annotations

import datetime as dt

from ..gold.series import is_derived
from ..gold.vintage import knowable_on
from ..registry.spec import IndicatorSpec
from ..storage.silver import SilverStore

SHOWN = 12


def run_published(spec: IndicatorSpec, silver: SilverStore, by: dt.date) -> int:
    if is_derived(spec):
        print(f"{spec.id} is derived in gold; ask of its inputs instead")
        return 2
    rows = knowable_on(spec, silver, by)
    print(f"{spec.name_zh} ({spec.id}), as knowable on {by}")
    if not rows:
        print(
            "  nothing: no print was released by then, and no undated print had "
            "been learned. A release date is never assumed."
        )
        return 0
    print(f"  {'period':<12} {'value':>10}  {'released':<12} known from")
    for r in rows[-SHOWN:]:
        released = r["published_on"].isoformat() if r["published_on"] else "not stated"
        basis = (
            "its release"
            if r["basis"] == "published"
            else f"learned {r['fetched_at'].astimezone(dt.UTC):%Y-%m-%d}"
        )
        print(f"  {r['obs_date']!s:<12} {r['value']!s:>10}  {released:<12} {basis}")
    latest = rows[-1]
    print(
        f"\nlatest knowable: {latest['obs_date']} = {latest['value']} {spec.unit}"
        + (f", released {latest['published_on']}" if latest["published_on"] else "")
    )
    return 0
