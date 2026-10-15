"""Is anyone still collecting?

Staleness (staleness.py) asks whether a *publisher* has moved on, on the
series' own cadence. That is the wrong clock for a collector that stopped:
the local job was never installed for three days before anyone could have
known, and the first staleness alarm would have come three weeks later.

The evidence used here is what a collector leaves in bronze. Every successful
fetch appends a manifest line, and a failed one appends nothing, so the
newest fetch per (reach, adapter) group says whether that source is still
being reached from where it answers. A job that runs and reaches nothing
looks exactly as dead as one that never runs, which is the point. See
docs/adr/0023.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..storage.bronze import BronzeStore
from .spec import Registry

# How long a group may go without a successful fetch.
#   anywhere  GitHub's cron runs daily; one missed run is already a failure
#   cn        a laptop asleep over a weekend is not broken; three days is
MAX_HOURS: dict[str, int] = {"anywhere": 36, "cn": 72}


@dataclass(frozen=True, slots=True)
class Heartbeat:
    group: str  # "<reach>/<adapter>"
    latest: dt.datetime | None
    indicator: str | None  # whose fetch was the newest
    age_hours: int | None
    limit_hours: int

    @property
    def failing(self) -> bool:
        # Never collected is not fine: it is the state the cn collector was in.
        return self.age_hours is None or self.age_hours > self.limit_hours

    @property
    def note(self) -> str:
        if self.latest is None:
            return "NEVER FETCHED"
        if self.failing:
            return f"SILENT {self.age_hours}h > {self.limit_hours}h"
        return f"{self.age_hours}h"


def latest_fetch(bronze: BronzeStore, indicator: str) -> dt.datetime | None:
    """The newest successful fetch on record for one indicator."""
    times = [dt.datetime.fromisoformat(e["fetched_at"]) for e in bronze.history(indicator)]
    return max(times, default=None)


def check_groups(
    registry: Registry, bronze: BronzeStore, *, now: dt.datetime | None = None
) -> list[Heartbeat]:
    now = now or dt.datetime.now(dt.UTC)
    groups: dict[str, list[str]] = {}
    for spec in registry:
        groups.setdefault(f"{spec.reach}/{spec.adapter}", []).append(spec.id)

    beats = []
    for group, ids in sorted(groups.items()):
        fetched = [(t, i) for i in ids if (t := latest_fetch(bronze, i)) is not None]
        latest, indicator = max(fetched, default=(None, None))
        age = None if latest is None else int((now - latest).total_seconds() // 3600)
        beats.append(
            Heartbeat(group, latest, indicator, age, MAX_HOURS[group.split("/")[0]])
        )
    return beats
